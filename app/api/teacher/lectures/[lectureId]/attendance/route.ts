import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

type Params = { params: Promise<{ lectureId: string }> }

export async function GET(_request: Request, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher" && session.role !== "admin") return forbidden()

  const { lectureId } = await context.params
  const db = getDb()

  const lec = db
    .prepare(
      `SELECT l.id, c.teacher_id FROM lectures l JOIN courses c ON c.id = l.course_id WHERE l.id = ?`,
    )
    .get(lectureId) as { id: string; teacher_id: string } | undefined

  if (!lec || (session.role !== "admin" && lec.teacher_id !== session.sub)) {
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

export async function PATCH(request: Request, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher" && session.role !== "admin") return forbidden()

  const { lectureId } = await context.params
  const body = await request.json().catch(() => ({}))
  const studentId = typeof body.studentId === "string" ? body.studentId : ""
  const nextStatus = body.status === "present" ? "present" : body.status === "absent" ? "absent" : null

  if (!studentId || !nextStatus) {
    return NextResponse.json({ message: "studentId and valid status are required." }, { status: 400 })
  }

  const db = getDb()
  const lec = db
    .prepare(
      `SELECT l.id, l.course_id, c.teacher_id
       FROM lectures l
       JOIN courses c ON c.id = l.course_id
       WHERE l.id = ?`,
    )
    .get(lectureId) as { id: string; course_id: string; teacher_id: string } | undefined

  if (!lec || (session.role !== "admin" && lec.teacher_id !== session.sub)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 })
  }

  const enrolled = db
    .prepare("SELECT 1 FROM course_enrollments WHERE course_id = ? AND student_id = ?")
    .get(lec.course_id, studentId) as { 1: number } | undefined

  if (!enrolled) {
    return NextResponse.json({ message: "Student is not enrolled in this lecture course." }, { status: 400 })
  }

  const existing = db
    .prepare("SELECT id FROM attendance WHERE lecture_id = ? AND student_id = ?")
    .get(lectureId, studentId) as { id: string } | undefined

  if (existing) {
    db.prepare(
      `UPDATE attendance
       SET status = ?,
           check_out_time = datetime('now')
       WHERE lecture_id = ? AND student_id = ?`,
    ).run(nextStatus, lectureId, studentId)
  } else {
    db.prepare(
      `INSERT INTO attendance (
        id, lecture_id, student_id, status, check_in_time, check_out_time, location_verified
      ) VALUES (lower(hex(randomblob(16))), ?, ?, ?, datetime('now'), datetime('now'), 0)`,
    ).run(lectureId, studentId, nextStatus)
  }

  return NextResponse.json({ success: true, lectureId, studentId, status: nextStatus })
}
