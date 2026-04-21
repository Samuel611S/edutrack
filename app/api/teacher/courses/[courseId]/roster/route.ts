import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

type Params = { params: Promise<{ courseId: string }> }

export async function GET(_request: Request, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher" && session.role !== "admin") return forbidden()

  const { courseId } = await context.params
  const db = getDb()

  const course = session.role === "admin"
    ? (db
        .prepare(`SELECT c.id, c.course_code, c.course_name, c.semester FROM courses c WHERE c.id = ?`)
        .get(courseId) as { id: string; course_code: string; course_name: string; semester: string } | undefined)
    : (db
        .prepare(
          `SELECT c.id, c.course_code, c.course_name, c.semester FROM courses c WHERE c.id = ? AND c.teacher_id = ?`,
        )
        .get(courseId, session.sub) as
        | { id: string; course_code: string; course_name: string; semester: string }
        | undefined)

  if (!course) return NextResponse.json({ message: "Course not found" }, { status: 404 })

  const students = db
    .prepare(
      `SELECT e.id AS enrollment_id, e.student_id, e.grade, s.full_name, s.email, s.student_id AS student_code, s.major
       FROM course_enrollments e
       JOIN students s ON s.id = e.student_id
       WHERE e.course_id = ?
       ORDER BY s.full_name`,
    )
    .all(courseId) as {
    enrollment_id: string
    student_id: string
    grade: string | null
    full_name: string
    email: string
    student_code: string
    major: string | null
  }[]

  return NextResponse.json({
    course,
    students: students.map((r) => ({
      enrollmentId: r.enrollment_id,
      studentId: r.student_id,
      studentCode: r.student_code,
      fullName: r.full_name,
      email: r.email,
      major: r.major ?? "",
      grade: r.grade ?? "",
    })),
  })
}
