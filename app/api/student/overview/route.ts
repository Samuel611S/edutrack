import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

export async function GET() {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "student") return forbidden()

  const db = getDb()
  const sid = session.sub

  const student = db.prepare("SELECT gpa FROM students WHERE id = ?").get(sid) as { gpa: number } | undefined
  const gpa = student?.gpa != null ? Number(student.gpa) : 0

  const courses = db
    .prepare(
      `SELECT c.id, c.course_code, c.course_name, t.full_name AS teacher_name, e.id AS enrollment_id, e.grade
       FROM course_enrollments e
       JOIN courses c ON c.id = e.course_id
       JOIN teachers t ON t.id = c.teacher_id
       WHERE e.student_id = ?
       ORDER BY c.course_code`,
    )
    .all(sid) as {
    id: string
    course_code: string
    course_name: string
    teacher_name: string
    enrollment_id: string
    grade: string | null
  }[]

  const courseRows = courses.map((c) => {
    const total = db
      .prepare("SELECT COUNT(*) AS n FROM lectures WHERE course_id = ?")
      .get(c.id) as { n: number }
    const attended = db
      .prepare(
        `SELECT COUNT(*) AS n FROM attendance a
         JOIN lectures l ON l.id = a.lecture_id
         WHERE l.course_id = ? AND a.student_id = ? AND a.status = 'present'`,
      )
      .get(c.id, sid) as { n: number }
    const totalLec = total.n || 0
    const att = attended.n || 0
    const pct = totalLec > 0 ? Math.round((att / totalLec) * 1000) / 10 : 0
    const progress = Math.min(100, Math.round(pct * 0.95 + 5))
    return {
      id: c.id,
      code: c.course_code,
      name: c.course_name,
      teacher: c.teacher_name,
      enrollmentId: c.enrollment_id,
      grade: c.grade ?? "—",
      attendance: pct,
      progress,
    }
  })

  const avgAttendance =
    courseRows.length > 0
      ? Math.round((courseRows.reduce((s, x) => s + x.attendance, 0) / courseRows.length) * 10) / 10
      : 0

  const upcoming = db
    .prepare(
      `SELECT l.id, l.lecture_date, l.start_time, l.location, c.course_code AS course,
              CASE WHEN a.status = 'present' THEN 1 ELSE 0 END AS attended
       FROM lectures l
       JOIN courses c ON c.id = l.course_id
       JOIN course_enrollments e ON e.course_id = c.id AND e.student_id = ?
       LEFT JOIN attendance a ON a.lecture_id = l.id AND a.student_id = ?
       WHERE date(l.lecture_date) >= date('now', 'localtime')
       ORDER BY l.lecture_date ASC, l.start_time ASC
       LIMIT 12`,
    )
    .all(sid, sid) as {
    id: string
    lecture_date: string
    start_time: string
    location: string
    course: string
    attended: number
  }[]

  const upcomingLectures = upcoming.map((u) => ({
    id: u.id,
    course: u.course,
    date: String(u.lecture_date).slice(0, 10),
    time: u.start_time || "",
    location: u.location || "",
    attended: u.attended === 1,
  }))

  const attendedTotal = db
    .prepare(`SELECT COUNT(*) AS n FROM attendance WHERE student_id = ? AND status = 'present'`)
    .get(sid) as { n: number }
  const totalMarks = attendedTotal.n || 0
  const totalLecturesEnrolled = db
    .prepare(
      `SELECT COUNT(*) AS n FROM lectures l
       JOIN course_enrollments e ON e.course_id = l.course_id
       WHERE e.student_id = ?`,
    )
    .get(sid) as { n: number }
  const missed = Math.max(0, (totalLecturesEnrolled.n || 0) - totalMarks)

  const materials = db
    .prepare(
      `SELECT m.id, m.title, m.description, m.file_url, c.course_code, c.course_name
       FROM lecture_materials m
       JOIN lectures l ON l.id = m.lecture_id
       JOIN courses c ON c.id = l.course_id
       JOIN course_enrollments e ON e.course_id = c.id AND e.student_id = ?
       ORDER BY c.course_code, m.title`,
    )
    .all(sid) as {
    id: string
    title: string
    description: string | null
    file_url: string | null
    course_code: string
    course_name: string
  }[]

  const courseLevel = db
    .prepare(
      `SELECT m.id, m.title, m.description, m.material_type, m.url, c.course_code, c.course_name
       FROM course_materials m
       JOIN courses c ON c.id = m.course_id
       JOIN course_enrollments e ON e.course_id = c.id AND e.student_id = ?
       ORDER BY c.course_code, m.sort_order, m.created_at`,
    )
    .all(sid) as {
    id: string
    title: string
    description: string | null
    material_type: string
    url: string
    course_code: string
    course_name: string
  }[]

  type MaterialItem = {
    id: string
    title: string
    kind: "video" | "pdf" | "file"
    href: string | null
    description: string | null
  }

  const materialsByCourse = new Map<string, { code: string; name: string; items: MaterialItem[] }>()
  for (const m of courseLevel) {
    const key = m.course_code
    if (!materialsByCourse.has(key)) {
      materialsByCourse.set(key, { code: m.course_code, name: m.course_name, items: [] })
    }
    const kind = m.material_type === "video" ? "video" : m.material_type === "pdf" ? "pdf" : "file"
    materialsByCourse.get(key)!.items.push({
      id: `cm:${m.id}`,
      title: m.title,
      kind,
      href: m.url,
      description: m.description,
    })
  }
  for (const m of materials) {
    const key = m.course_code
    if (!materialsByCourse.has(key)) {
      materialsByCourse.set(key, { code: m.course_code, name: m.course_name, items: [] })
    }
    materialsByCourse.get(key)!.items.push({
      id: `lec:${m.id}`,
      title: m.title,
      kind: "file",
      href: m.file_url,
      description: m.description,
    })
  }

  const semesterRow = db
    .prepare(
      `SELECT c.semester
       FROM course_enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = ?
       ORDER BY c.semester DESC
       LIMIT 1`,
    )
    .get(sid) as { semester: string } | undefined
  const semester = semesterRow?.semester ?? "2026-Spring"
  const paymentTotals = db
    .prepare(
      `SELECT COALESCE(SUM(c.credits), 0) AS total_credits
       FROM course_enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = ? AND c.semester = ?`,
    )
    .get(sid, semester) as { total_credits: number }
  const tuitionAmount = Number(paymentTotals.total_credits || 0) * 4000
  const paymentRow = db
    .prepare(
      `SELECT payment_status, COALESCE(paid_amount, 0) AS paid_amount
       FROM student_payments
       WHERE student_id = ? AND semester = ?`,
    )
    .get(sid, semester) as { payment_status: "paid" | "unpaid"; paid_amount: number } | undefined
  const paidAmount = Math.min(tuitionAmount, Math.max(0, Number(paymentRow?.paid_amount || 0)))
  const balance = Math.max(0, tuitionAmount - paidAmount)

  return NextResponse.json({
    stats: {
      enrolledCourses: courseRows.length,
      avgAttendance,
      gpa,
      upcomingCount: upcomingLectures.length,
    },
    attendanceSummary: {
      attended: totalMarks,
      missed,
    },
    courses: courseRows,
    upcomingLectures,
    materialsByCourse: Array.from(materialsByCourse.values()),
    finance: {
      semester,
      tuitionAmount,
      paidAmount,
      balance,
      paymentStatus: balance <= 0 ? "paid" : "unpaid",
    },
  })
}
