import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

type Params = { params: Promise<{ courseId: string }> }

function assertOwnCourse(db: ReturnType<typeof getDb>, courseId: string, teacherId: string) {
  const row = db
    .prepare("SELECT id FROM courses WHERE id = ? AND teacher_id = ?")
    .get(courseId, teacherId) as { id: string } | undefined
  return row
}

export async function PATCH(request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher") return forbidden()

  const { courseId } = await context.params
  const db = getDb()
  if (!assertOwnCourse(db, courseId, session.sub)) {
    return NextResponse.json({ message: "Course not found" }, { status: 404 })
  }

  const body = await request.json()
  const { course_code, course_name, description, semester, credits, max_capacity } = body as Record<
    string,
    string | number | null | undefined
  >

  const updates: string[] = []
  const values: (string | number | null)[] = []

  if (course_code !== undefined) {
    updates.push("course_code = ?")
    values.push(String(course_code).trim())
  }
  if (course_name !== undefined) {
    updates.push("course_name = ?")
    values.push(String(course_name).trim())
  }
  if (description !== undefined) {
    updates.push("description = ?")
    const d = String(description).trim()
    values.push(d === "" ? null : d)
  }
  if (semester !== undefined) {
    updates.push("semester = ?")
    values.push(String(semester).trim())
  }
  if (credits !== undefined) {
    updates.push("credits = ?")
    values.push(Number(credits))
  }
  if (max_capacity !== undefined) {
    updates.push("max_capacity = ?")
    values.push(max_capacity === "" || max_capacity == null ? null : Number(max_capacity))
  }

  if (updates.length === 0) {
    return NextResponse.json({ message: "No fields to update" }, { status: 400 })
  }

  try {
    db.prepare(`UPDATE courses SET ${updates.join(", ")} WHERE id = ?`).run(...values, courseId)
  } catch (e) {
    console.error("[EduTrack] Teacher patch course:", e)
    return NextResponse.json({ message: "Could not update course" }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher") return forbidden()

  const { courseId } = await context.params
  const db = getDb()
  if (!assertOwnCourse(db, courseId, session.sub)) {
    return NextResponse.json({ message: "Course not found" }, { status: 404 })
  }

  db.prepare("DELETE FROM courses WHERE id = ?").run(courseId)
  return NextResponse.json({ success: true })
}
