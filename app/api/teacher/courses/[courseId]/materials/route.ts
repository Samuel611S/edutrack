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

function assertOwnCourse(db: ReturnType<typeof getDb>, courseId: string, teacherId: string, isAdmin: boolean) {
  if (isAdmin) {
    return db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId) as { id: string } | undefined
  }
  return db.prepare("SELECT id FROM courses WHERE id = ? AND teacher_id = ?").get(courseId, teacherId) as
    | { id: string }
    | undefined
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
      // URL-based material upload
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
    } else if (contentType.includes("multipart/form-data")) {
      // File-based material upload
      const formData = await request.formData()
      const title = formData.get("title") as string
      const description = formData.get("description") as string | null
      const file = formData.get("file") as File | null

      if (!title || !title.trim()) {
        return NextResponse.json({ message: "Title is required" }, { status: 400 })
      }

      if (!file) {
        return NextResponse.json({ message: "File is required" }, { status: 400 })
      }

      const mt = inferMaterialTypeFromFile(file.name)
      if (!mt) {
        return NextResponse.json({ message: "File must be PDF, DOC, or DOCX" }, { status: 400 })
      }

      // Validate file type
      const allowedMimes = {
        pdf: "application/pdf",
        word: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        docx: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      }

      const mimeType = file.type
      const allowedForType = allowedMimes[mt as "pdf" | "word" | "docx"]
      const isAllowed = Array.isArray(allowedForType)
        ? allowedForType.includes(mimeType)
        : mimeType === allowedForType

      if (!isAllowed) {
        return NextResponse.json({ message: `Invalid file type for ${mt}` }, { status: 400 })
      }

      // Create uploads directory
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "materials")
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true })
      }

      // Save file
      const fileBuffer = Buffer.from(await file.arrayBuffer())
      const fileName = `${Date.now()}_${file.name}`
      const filePath = path.join(uploadsDir, fileName)
      const relativeFilePath = `/uploads/materials/${fileName}`

      writeFileSync(filePath, fileBuffer)

      try {
        const id = insertCourseMaterial(db, courseId, {
          title: title.trim(),
          description: description?.trim() || null,
          materialType: mt,
          filePath: relativeFilePath,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        })
        return NextResponse.json({ success: true, id })
      } catch (e) {
        console.error("[EduTrack] Teacher add course material:", e)
        return NextResponse.json({ message: "Could not save material" }, { status: 400 })
      }
    } else {
      return NextResponse.json({ message: "Invalid content type" }, { status: 400 })
    }
  } catch (error) {
    console.error("[EduTrack] Error processing material upload:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
