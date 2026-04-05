import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

type Params = { params: Promise<{ enrollmentId: string }> }

export async function PATCH(request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher") return forbidden()

  const { enrollmentId } = await context.params
  const body = await request.json()
  const grade = typeof body.grade === "string" ? body.grade.trim() : ""
  if (!grade) return NextResponse.json({ message: "grade required" }, { status: 400 })

  const db = getDb()
  const row = db
    .prepare(
      `SELECT e.id FROM course_enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.id = ? AND c.teacher_id = ?`,
    )
    .get(enrollmentId, session.sub) as { id: string } | undefined

  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 })

  db.prepare("UPDATE course_enrollments SET grade = ? WHERE id = ?").run(grade, enrollmentId)
  return NextResponse.json({ success: true })
}
