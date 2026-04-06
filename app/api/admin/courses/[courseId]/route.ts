import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

type Params = { params: Promise<{ courseId: string }> }

export async function PATCH(request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const { courseId } = await context.params
  const body = await request.json()
  const { course_code, course_name, description, teacher_id, semester, credits, max_capacity } = body as Record<
    string,
    string | number | null | undefined
  >

  const db = getDb()
  const exists = db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId) as { id: string } | undefined
  if (!exists) return NextResponse.json({ message: "Not found" }, { status: 404 })

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
  if (teacher_id !== undefined) {
    updates.push("teacher_id = ?")
    values.push(String(teacher_id).trim())
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
    console.error("[EduTrack] admin patch course:", e)
    return NextResponse.json({ message: "Could not update course" }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const { courseId } = await context.params
  const db = getDb()
  const res = db.prepare("DELETE FROM courses WHERE id = ?").run(courseId)
  if (res.changes === 0) return NextResponse.json({ message: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true })
}
