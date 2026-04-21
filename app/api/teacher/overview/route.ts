import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

export async function GET() {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher" && session.role !== "admin") return forbidden()

  const db = getDb()
  const tid = session.sub
  const allAccess = session.role === "admin"

  const courses = db
    .prepare(
      `SELECT c.id, c.course_code, c.course_name, c.semester, c.credits, c.max_capacity, c.description,
              (SELECT COUNT(*) FROM course_enrollments e WHERE e.course_id = c.id) AS students
       FROM courses c
       WHERE (? = 1 OR c.teacher_id = ?)
       ORDER BY c.course_code`,
    )
    .all(allAccess ? 1 : 0, tid) as {
    id: string
    course_code: string
    course_name: string
    semester: string
    credits: number
    max_capacity: number | null
    description: string | null
    students: number
  }[]

  const courseRows = courses.map((c) => {
    const lecCount =
      (db.prepare("SELECT COUNT(*) AS n FROM lectures WHERE course_id = ?").get(c.id) as { n: number }).n || 0
    const enrollCount = c.students || 0
    const presentCount =
      (
        db
          .prepare(
            `SELECT COUNT(*) AS n FROM attendance a
             JOIN lectures l ON l.id = a.lecture_id
             WHERE l.course_id = ? AND a.status = 'present'`,
          )
          .get(c.id) as { n: number }
      ).n || 0
    const denom = lecCount * enrollCount
    const avgAttendance = denom > 0 ? Math.round((presentCount / denom) * 1000) / 10 : 0
    return { ...c, avgAttendance, lecCount }
  })

  const lectures = db
    .prepare(
      `SELECT l.id, l.lecture_date, l.start_time, l.location, c.course_code AS course,
              (SELECT COUNT(*) FROM course_enrollments e WHERE e.course_id = l.course_id) AS enrolled,
              (SELECT COUNT(*) FROM attendance a WHERE a.lecture_id = l.id AND a.status = 'present') AS attended
       FROM lectures l
       JOIN courses c ON c.id = l.course_id
       WHERE (? = 1 OR c.teacher_id = ?)
       ORDER BY l.lecture_date DESC, l.start_time DESC`,
    )
    .all(allAccess ? 1 : 0, tid) as {
    id: string
    lecture_date: string
    start_time: string
    location: string
    course: string
    enrolled: number
    attended: number
  }[]

  const lectureRows = lectures.map((l) => ({
    id: l.id,
    date: String(l.lecture_date).slice(0, 10),
    time: l.start_time || "",
    course: l.course,
    location: l.location || "",
    enrolled: l.enrolled,
    attended: l.attended,
  }))

  const totalStudents = courseRows.reduce((s, c) => s + c.students, 0)
  const avgAll =
    courseRows.length > 0
      ? Math.round((courseRows.reduce((s, c) => s + c.avgAttendance, 0) / courseRows.length) * 10) / 10
      : 0

  const enrollRows = db
    .prepare(
      `SELECT e.id AS enrollment_id, e.grade, e.student_id, s.full_name AS student_name, e.course_id
       FROM course_enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN courses c ON c.id = e.course_id
       WHERE (? = 1 OR c.teacher_id = ?)
       ORDER BY e.course_id, s.full_name`,
    )
    .all(allAccess ? 1 : 0, tid) as {
    enrollment_id: string
    grade: string | null
    student_id: string
    student_name: string
    course_id: string
  }[]

  const gradebook: Record<
    string,
    { enrollmentId: string; studentId: string; studentName: string; grade: string }[]
  > = {}
  for (const r of enrollRows) {
    if (!gradebook[r.course_id]) gradebook[r.course_id] = []
    gradebook[r.course_id].push({
      enrollmentId: r.enrollment_id,
      studentId: r.student_id,
      studentName: r.student_name,
      grade: r.grade ?? "",
    })
  }

  return NextResponse.json({
    stats: {
      totalStudents,
      avgAttendance: avgAll,
      activeCourses: courseRows.length,
    },
    courses: courseRows.map(({ lecCount: _, ...rest }) => rest),
    lectures: lectureRows,
    gradebook,
  })
}
