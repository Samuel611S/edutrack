import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

const MAX_STANDARD_CREDITS = 21
const PRICE_PER_CREDIT = 4000

export async function GET() {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "student") return forbidden()

  const db = getDb()
  const studentId = session.sub

  const enrolled = db
    .prepare(
      `SELECT e.id AS enrollment_id, c.id, c.course_code, c.course_name, c.semester, c.credits, t.full_name AS teacher_name
       FROM course_enrollments e
       JOIN courses c ON c.id = e.course_id
       JOIN teachers t ON t.id = c.teacher_id
       WHERE e.student_id = ?
       ORDER BY c.semester DESC, c.course_code`,
    )
    .all(studentId)

  const available = db
    .prepare(
      `SELECT c.id, c.course_code, c.course_name, c.semester, c.credits, t.full_name AS teacher_name
       FROM courses c
       JOIN teachers t ON t.id = c.teacher_id
       ORDER BY c.semester DESC, c.course_code`,
    )
    .all()

  const requests = db
    .prepare(
      `SELECT r.id, r.batch_id, r.request_type, r.status, r.is_overload, r.reason, r.created_at,
              c.id AS course_id, c.course_code, c.course_name, c.semester
       FROM enrollment_requests r
       JOIN courses c ON c.id = r.course_id
       WHERE r.student_id = ?
       ORDER BY r.created_at DESC`,
    )
    .all(studentId)

  const currentSemester = (enrolled[0] as { semester?: string } | undefined)?.semester ?? "2026-Spring"
  const semesterCourses = enrolled.filter((row) => (row as { semester: string }).semester === currentSemester) as {
    credits: number
  }[]
  const totalCredits = semesterCourses.reduce((sum, c) => sum + Number(c.credits || 0), 0)
  const amount = totalCredits * PRICE_PER_CREDIT

  return NextResponse.json({
    maxStandardCredits: MAX_STANDARD_CREDITS,
    pricePerCredit: PRICE_PER_CREDIT,
    enrolled,
    available,
    requests,
    payment: {
      semester: currentSemester,
      totalCredits,
      amount,
    },
  })
}

export async function POST(request: NextRequest) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "student") return forbidden()

  const body = await request.json()
  const courseIds = Array.isArray(body.courseIds) ? (body.courseIds as unknown[]).map((x) => String(x)) : []
  const reason = body.reason != null ? String(body.reason).trim() : ""
  if (courseIds.length === 0) {
    return NextResponse.json({ message: "Select at least one course" }, { status: 400 })
  }

  const db = getDb()
  const studentId = session.sub

  const existingPendingBatch = db
    .prepare("SELECT id FROM enrollment_requests WHERE student_id = ? AND status = 'pending' LIMIT 1")
    .get(studentId) as { id: string } | undefined
  if (existingPendingBatch) {
    return NextResponse.json({ message: "You already have a pending request batch" }, { status: 400 })
  }

  const uniqueCourseIds = [...new Set(courseIds)]
  const courses = uniqueCourseIds
    .map((id) =>
      db.prepare("SELECT id, semester, credits FROM courses WHERE id = ?").get(id) as
        | { id: string; semester: string; credits: number }
        | undefined,
    )
    .filter(Boolean) as { id: string; semester: string; credits: number }[]

  if (courses.length !== uniqueCourseIds.length) {
    return NextResponse.json({ message: "One or more selected courses are invalid" }, { status: 400 })
  }

  const targetSemester = courses[0].semester
  if (courses.some((c) => c.semester !== targetSemester)) {
    return NextResponse.json({ message: "All selected courses must be in the same semester" }, { status: 400 })
  }

  const alreadyEnrolled = db
    .prepare(
      `SELECT c.id
       FROM course_enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = ? AND c.semester = ?`,
    )
    .all(studentId, targetSemester) as { id: string }[]
  const enrolledSet = new Set(alreadyEnrolled.map((x) => x.id))
  const currentCreditsRow = db
    .prepare(
      `SELECT COALESCE(SUM(c.credits), 0) AS total
       FROM course_enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = ? AND c.semester = ?`,
    )
    .get(studentId, targetSemester) as { total: number }
  const currentCredits = Number(currentCreditsRow.total || 0)

  for (const c of courses) {
    if (enrolledSet.has(c.id)) {
      return NextResponse.json({ message: "Remove already-enrolled courses from your selection" }, { status: 400 })
    }
  }

  const selectedCredits = courses.reduce((sum, c) => sum + Number(c.credits || 0), 0)
  const projectedCredits = currentCredits + selectedCredits
  if (projectedCredits > MAX_STANDARD_CREDITS && reason.length < 5) {
    return NextResponse.json({ message: "Reason is required when requesting more than 21 credit hours" }, { status: 400 })
  }

  const batchId = `batch_${randomUUID().slice(0, 10)}`
  const insert = db.prepare(
    `INSERT INTO enrollment_requests
     (id, batch_id, student_id, course_id, request_type, status, is_overload, reason)
     VALUES (?, ?, ?, ?, 'add', 'pending', ?, ?)`,
  )
  const tx = db.transaction(() => {
    let runningCredits = currentCredits
    courses.forEach((c) => {
      runningCredits += Number(c.credits || 0)
      const isOverload = runningCredits > MAX_STANDARD_CREDITS ? 1 : 0
      insert.run(`req_${randomUUID().slice(0, 10)}`, batchId, studentId, c.id, isOverload, isOverload ? reason || null : null)
    })
  })
  tx()

  return NextResponse.json({ success: true, batchId })
}
