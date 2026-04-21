import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const { id } = await context.params
  const db = getDb()
  const student = db.prepare("SELECT id, full_name FROM students WHERE id = ?").get(id) as
    | { id: string; full_name: string }
    | undefined
  if (!student) return NextResponse.json({ message: "Student not found" }, { status: 404 })

  const enrolled = db
    .prepare(
      `SELECT e.id AS enrollment_id, c.id AS course_id, c.course_code, c.course_name, c.semester, t.full_name AS teacher_name
       FROM course_enrollments e
       JOIN courses c ON c.id = e.course_id
       JOIN teachers t ON t.id = c.teacher_id
       WHERE e.student_id = ?
       ORDER BY c.semester DESC, c.course_code`,
    )
    .all(id)

  const courses = db
    .prepare(
      `SELECT c.id, c.course_code, c.course_name, c.semester, t.full_name AS teacher_name
       FROM courses c
       JOIN teachers t ON t.id = c.teacher_id
       ORDER BY c.semester DESC, c.course_code`,
    )
    .all()

  const requests = db
    .prepare(
      `SELECT r.id, r.request_type, r.status, r.is_overload, r.reason, r.created_at,
              c.course_code, c.course_name, c.semester,
              t.full_name AS reviewed_by_name
       FROM enrollment_requests r
       JOIN courses c ON c.id = r.course_id
       LEFT JOIN teachers t ON t.id = r.reviewed_by
       WHERE r.student_id = ?
       ORDER BY r.created_at DESC`,
    )
    .all(id)

  const payment = db
    .prepare(
      `SELECT id, semester, total_credits, amount, amount_per_credit, payment_status, updated_at
       FROM student_payments
       WHERE student_id = ?
       ORDER BY semester DESC
       LIMIT 1`,
    )
    .get(id)

  return NextResponse.json({ student, enrolled, courses, requests, payment })
}

export async function PATCH(request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const { id } = await context.params
  const body = await request.json()
  const action = String(body.action || "").trim() as "add" | "remove"
  const courseId = String(body.courseId || "").trim()
  if (!courseId || (action !== "add" && action !== "remove")) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
  }

  const db = getDb()
  const studentExists = db.prepare("SELECT id FROM students WHERE id = ?").get(id) as { id: string } | undefined
  if (!studentExists) return NextResponse.json({ message: "Student not found" }, { status: 404 })

  if (action === "add") {
    const exists = db
      .prepare("SELECT id FROM course_enrollments WHERE student_id = ? AND course_id = ?")
      .get(id, courseId) as { id: string } | undefined
    if (!exists) {
      db.prepare("INSERT INTO course_enrollments (id, course_id, student_id) VALUES (?, ?, ?)").run(
        `enr_${randomUUID().slice(0, 10)}`,
        courseId,
        id,
      )
    }
  } else {
    db.prepare("DELETE FROM course_enrollments WHERE student_id = ? AND course_id = ?").run(id, courseId)
  }

  return NextResponse.json({ success: true })
}
