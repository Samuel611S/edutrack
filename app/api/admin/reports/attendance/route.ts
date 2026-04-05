import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

export async function GET(request: Request) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format")

  const db = getDb()
  const rows = db
    .prepare(
      `SELECT c.course_code, c.course_name, l.lecture_date, l.start_time,
              s.id AS student_id, s.full_name, a.status, a.check_in_time,
              a.distance_from_lecture, a.location_verified
       FROM attendance a
       JOIN lectures l ON l.id = a.lecture_id
       JOIN courses c ON c.id = l.course_id
       JOIN students s ON s.id = a.student_id
       ORDER BY l.lecture_date DESC, c.course_code, s.full_name`,
    )
    .all() as {
    course_code: string
    course_name: string
    lecture_date: string
    start_time: string
    student_id: string
    full_name: string
    status: string
    check_in_time: string | null
    distance_from_lecture: number | null
    location_verified: number | null
  }[]

  if (format === "csv") {
    const header =
      "course_code,course_name,lecture_date,start_time,student_id,student_name,status,check_in,distance_m,location_verified\n"
    const lines = rows.map((r) =>
      [
        r.course_code,
        `"${r.course_name.replace(/"/g, '""')}"`,
        String(r.lecture_date).slice(0, 10),
        r.start_time ?? "",
        r.student_id,
        `"${r.full_name.replace(/"/g, '""')}"`,
        r.status,
        r.check_in_time ?? "",
        r.distance_from_lecture ?? "",
        r.location_verified ?? "",
      ].join(","),
    )
    const csv = header + lines.join("\n")
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="admin-attendance-report.csv"',
      },
    })
  }

  return NextResponse.json({ count: rows.length, records: rows })
}
