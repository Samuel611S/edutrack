import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

export async function GET() {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const db = getDb()
  const students = (db.prepare("SELECT COUNT(*) AS n FROM students").get() as { n: number }).n
  const teachers = (db.prepare("SELECT COUNT(*) AS n FROM teachers").get() as { n: number }).n
  const courses = (db.prepare("SELECT COUNT(*) AS n FROM courses").get() as { n: number }).n

  const att = db
    .prepare(
      `SELECT
         ROUND(100.0 * SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS pct
       FROM attendance`,
    )
    .get() as { pct: number | null }
  const avgAttendance = att.pct ?? 0

  const recent = db
    .prepare(
      `SELECT 'Attendance' AS type,
              a.student_id || ' marked ' || a.status || ' for ' || c.course_code AS description,
              a.created_at AS at
       FROM attendance a
       JOIN lectures l ON l.id = a.lecture_id
       JOIN courses c ON c.id = l.course_id
       ORDER BY a.created_at DESC
       LIMIT 8`,
    )
    .all() as { type: string; description: string; at: string }[]

  return NextResponse.json({
    stats: { students, teachers, courses, avgAttendance },
    recentActivity: recent.map((r) => ({
      type: r.type,
      description: r.description,
      time: r.at,
    })),
  })
}
