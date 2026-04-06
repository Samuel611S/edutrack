import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"
import {
  deleteCourseMaterial,
  parseMaterialType,
  sanitizeMaterialUrl,
  updateCourseMaterial,
} from "@/lib/course-materials"

type Params = { params: Promise<{ courseId: string; materialId: string }> }

function assertOwnCourse(db: ReturnType<typeof getDb>, courseId: string, teacherId: string) {
  return db.prepare("SELECT id FROM courses WHERE id = ? AND teacher_id = ?").get(courseId, teacherId) as
    | { id: string }
    | undefined
}

export async function PATCH(request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher") return forbidden()

  const { courseId, materialId } = await context.params
  const db = getDb()
  if (!assertOwnCourse(db, courseId, session.sub)) {
    return NextResponse.json({ message: "Course not found" }, { status: 404 })
  }

  const body = await request.json()
  const { title, description, materialType, url } = body as Record<string, string | null | undefined>
  const patch: Parameters<typeof updateCourseMaterial>[3] = {}
  if (title !== undefined) {
    const t = String(title).trim()
    if (!t) return NextResponse.json({ message: "Title cannot be empty" }, { status: 400 })
    patch.title = t
  }
  if (description !== undefined) {
    patch.description = description === null || String(description).trim() === "" ? null : String(description).trim()
  }
  if (materialType !== undefined) {
    const mt = parseMaterialType(materialType)
    if (!mt) return NextResponse.json({ message: "materialType must be video or pdf" }, { status: 400 })
    patch.materialType = mt
  }
  if (url !== undefined) {
    const safe = sanitizeMaterialUrl(String(url))
    if (!safe) return NextResponse.json({ message: "A valid URL is required" }, { status: 400 })
    patch.url = safe
  }

  const ok = updateCourseMaterial(db, courseId, materialId, patch)
  if (!ok) return NextResponse.json({ message: "Material not found" }, { status: 404 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher") return forbidden()

  const { courseId, materialId } = await context.params
  const db = getDb()
  if (!assertOwnCourse(db, courseId, session.sub)) {
    return NextResponse.json({ message: "Course not found" }, { status: 404 })
  }

  const ok = deleteCourseMaterial(db, courseId, materialId)
  if (!ok) return NextResponse.json({ message: "Material not found" }, { status: 404 })
  return NextResponse.json({ success: true })
}
