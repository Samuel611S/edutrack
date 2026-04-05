import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

type Params = { params: Promise<{ lectureId: string }> }

export async function GET(_request: Request, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher") return forbidden()

  const { lectureId } = await context.params
  const db = getDb()

  const lec = db
    .prepare(
      `SELECT l.id, c.teacher_id FROM lectures l JOIN courses c ON c.id = l.course_id WHERE l.id = ?`,
    )
    .get(lectureId) as { id: string; teacher_id: string } | undefined

  if (!lec || lec.teacher_id !== session.sub) {
    return NextResponse.json({ message: "Not found" }, { status: 404 })
  }

  const rows = db
    .prepare(
      `SELECT s.id AS student_id, s.full_name,
              a.status, a.check_in_time, a.location_verified, a.distance_from_lecture
       FROM course_enrollments e
       JOIN students s ON s.id = e.student_id
       LEFT JOIN attendance a ON a.student_id = s.id AND a.lecture_id = ?
       WHERE e.course_id = (SELECT course_id FROM lectures WHERE id = ?)
       ORDER BY s.full_name`,
    )
    .all(lectureId, lectureId) as {
    student_id: string
    full_name: string
    status: string | null
    check_in_time: string | null
    location_verified: number | null
    distance_from_lecture: number | null
  }[]

  return NextResponse.json({ lectureId, students: rows })
}
