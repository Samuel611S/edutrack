import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"
import {
  insertCourseMaterial,
  listCourseMaterials,
  parseMaterialType,
  sanitizeMaterialUrl,
} from "@/lib/course-materials"

type Params = { params: Promise<{ courseId: string }> }

function assertCourse(db: ReturnType<typeof getDb>, courseId: string) {
  return db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId) as { id: string } | undefined
}

export async function GET(_request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const { courseId } = await context.params
  const db = getDb()
  if (!assertCourse(db, courseId)) {
    return NextResponse.json({ message: "Course not found" }, { status: 404 })
  }

  const materials = listCourseMaterials(db, courseId)
  return NextResponse.json({ materials })
}

export async function POST(request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const { courseId } = await context.params
  const db = getDb()
  if (!assertCourse(db, courseId)) {
    return NextResponse.json({ message: "Course not found" }, { status: 404 })
  }

  const body = await request.json()
  const { title, description, materialType, url } = body as Record<string, string | undefined>
  const t = typeof title === "string" ? title.trim() : ""
  if (!t) return NextResponse.json({ message: "Title is required" }, { status: 400 })
  const mt = parseMaterialType(materialType)
  if (!mt) return NextResponse.json({ message: "materialType must be video or pdf" }, { status: 400 })
  const safeUrl = sanitizeMaterialUrl(typeof url === "string" ? url : "")
  if (!safeUrl) return NextResponse.json({ message: "A valid URL is required" }, { status: 400 })

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
    console.error("[EduTrack] Admin add course material:", e)
    return NextResponse.json({ message: "Could not save material" }, { status: 400 })
  }
}
