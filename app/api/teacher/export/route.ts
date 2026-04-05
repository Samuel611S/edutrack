import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

export async function GET(request: Request) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher") return forbidden()

  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get("courseId")
  if (!courseId) return NextResponse.json({ message: "courseId required" }, { status: 400 })

  const db = getDb()
  const course = db
    .prepare("SELECT course_code, course_name FROM courses WHERE id = ? AND teacher_id = ?")
    .get(courseId, session.sub) as { course_code: string; course_name: string } | undefined
  if (!course) return NextResponse.json({ message: "Not found" }, { status: 404 })

  const rows = db
    .prepare(
      `SELECT l.lecture_date, l.start_time, s.full_name, s.id AS student_id,
              a.status, a.check_in_time, a.distance_from_lecture
       FROM lectures l
       CROSS JOIN course_enrollments e ON e.course_id = l.course_id
       JOIN students s ON s.id = e.student_id
       LEFT JOIN attendance a ON a.lecture_id = l.id AND a.student_id = s.id
       WHERE l.course_id = ?
       ORDER BY l.lecture_date, s.full_name`,
    )
    .all(courseId) as {
    lecture_date: string
    start_time: string
    full_name: string
    student_id: string
    status: string | null
    check_in_time: string | null
    distance_from_lecture: number | null
  }[]

  const header = "lecture_date,start_time,student_id,student_name,status,check_in,distance_m\n"
  const lines = rows.map((r) =>
    [
      String(r.lecture_date).slice(0, 10),
      r.start_time ?? "",
      r.student_id,
      `"${r.full_name.replace(/"/g, '""')}"`,
      r.status ?? "absent",
      r.check_in_time ?? "",
      r.distance_from_lecture ?? "",
    ].join(","),
  )

  const csv = header + lines.join("\n")
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${course.course_code}.csv"`,
    },
  })
}
