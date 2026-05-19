import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"
import {
  insertCourseMaterial,
  listCourseMaterials,
  parseMaterialType,
  sanitizeMaterialUrl,
  inferMaterialTypeFromFile,
  inferMaterialTypeFromUrl,
} from "@/lib/course-materials"
import path from "path"
import { writeFileSync, mkdirSync, existsSync } from "fs"

type Params = { params: Promise<{ courseId: string }> }

const ALLOWED_MIMES: Record<string, string | string[]> = {
  pdf: "application/pdf",
  word: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  docx: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  video: ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/x-matroska", "video/avi", "video/x-msvideo"],
}

function mimeAllowed(materialType: string, mimeType: string): boolean {
  const allowedForType = ALLOWED_MIMES[materialType]
  if (!allowedForType) return false
  if (Array.isArray(allowedForType)) return allowedForType.includes(mimeType)
  return mimeType === allowedForType
}

function assertOwnCourse(db: ReturnType<typeof getDb>, courseId: string, teacherId: string, isAdmin: boolean) {
  if (isAdmin) {
    return db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId) as { id: string } | undefined
  }
  return db.prepare("SELECT id FROM courses WHERE id = ? AND teacher_id = ?").get(courseId, teacherId) as
    | { id: string }
    | undefined
}

function collectUploadFiles(formData: FormData): File[] {
  const fromFiles = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
  if (fromFiles.length > 0) return fromFiles

  const legacy = formData.get("file")
  if (legacy instanceof File && legacy.size > 0) return [legacy]
  return []
}

async function saveUploadedFile(
  db: ReturnType<typeof getDb>,
  courseId: string,
  file: File,
  title: string,
  description: string | null,
): Promise<string> {
  const mt = inferMaterialTypeFromFile(file.name)
  if (!mt) {
    throw new Error("UNSUPPORTED_FILE")
  }

  if (file.type && !mimeAllowed(mt, file.type)) {
    throw new Error("INVALID_MIME")
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "materials")
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true })
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const fileName = `${Date.now()}_${file.name}`
  const filePath = path.join(uploadsDir, fileName)
  const relativeFilePath = `/uploads/materials/${fileName}`

  writeFileSync(filePath, fileBuffer)

  return insertCourseMaterial(db, courseId, {
    title: title.trim(),
    description,
    materialType: mt,
    filePath: relativeFilePath,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || null,
  })
}

export async function GET(_request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher" && session.role !== "admin") return forbidden()

  const { courseId } = await context.params
  const db = getDb()
  if (!assertOwnCourse(db, courseId, session.sub, session.role === "admin")) {
    return NextResponse.json({ message: "Course not found" }, { status: 404 })
  }

  const materials = listCourseMaterials(db, courseId)
  return NextResponse.json({ materials })
}

export async function POST(request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher" && session.role !== "admin") return forbidden()

  const { courseId } = await context.params
  const db = getDb()
  if (!assertOwnCourse(db, courseId, session.sub, session.role === "admin")) {
    return NextResponse.json({ message: "Course not found" }, { status: 404 })
  }

  try {
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      const body = await request.json()
      const { title, description, materialType, url } = body as Record<string, string | undefined>
      const t = typeof title === "string" ? title.trim() : ""
      if (!t) return NextResponse.json({ message: "Title is required" }, { status: 400 })
      const safeUrl = sanitizeMaterialUrl(typeof url === "string" ? url : "")
      if (!safeUrl) return NextResponse.json({ message: "A valid URL is required" }, { status: 400 })
      const mt = parseMaterialType(materialType) ?? inferMaterialTypeFromUrl(safeUrl)
      if (!mt) return NextResponse.json({ message: "Could not determine material type from URL" }, { status: 400 })

      const desc =
        typeof description === "string" && description.trim() !== "" ? description.trim() : null

      try {
        const id = insertCourseMaterial(db, courseId, {
          title: t,
          description: desc,
          materialType: mt,
          url: safeUrl,
        })
        return NextResponse.json({ success: true, id })
      } catch (e) {
        console.error("[EduTrack] Teacher add course material:", e)
        return NextResponse.json({ message: "Could not save material" }, { status: 400 })
      }
    }

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const title = formData.get("title") as string
      const description = formData.get("description") as string | null
      const files = collectUploadFiles(formData)

      if (!title || !title.trim()) {
        return NextResponse.json({ message: "Title is required" }, { status: 400 })
      }

      if (files.length === 0) {
        return NextResponse.json({ message: "At least one file is required" }, { status: 400 })
      }

      const desc = description?.trim() || null
      const ids: string[] = []

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const itemTitle =
            files.length === 1 ? title.trim() : `${title.trim()} (${file.name})`
          const id = await saveUploadedFile(db, courseId, file, itemTitle, desc)
          ids.push(id)
        }
        return NextResponse.json({ success: true, id: ids[0], ids, count: ids.length })
      } catch (e) {
        if (e instanceof Error && e.message === "UNSUPPORTED_FILE") {
          return NextResponse.json(
            { message: "Files must be PDF, Word (DOC/DOCX), or video (MP4, WebM, MOV, etc.)" },
            { status: 400 },
          )
        }
        if (e instanceof Error && e.message === "INVALID_MIME") {
          return NextResponse.json({ message: "One or more files has an invalid type" }, { status: 400 })
        }
        console.error("[EduTrack] Teacher add course material:", e)
        return NextResponse.json({ message: "Could not save material" }, { status: 400 })
      }
    }

    return NextResponse.json({ message: "Invalid content type" }, { status: 400 })
  } catch (error) {
    console.error("[EduTrack] Error processing material upload:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
