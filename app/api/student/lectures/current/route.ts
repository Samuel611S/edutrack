import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

export async function GET() {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "student") return forbidden()

  const db = getDb()

  const upcoming = db
    .prepare(
      `SELECT l.id, l.course_id, l.lecture_date, l.start_time, l.end_time, l.location,
              l.latitude, l.longitude,
              COALESCE(l.allowed_radius_m, 100) AS allowed_radius_m,
              c.course_code, c.course_name
       FROM lectures l
       JOIN courses c ON c.id = l.course_id
       JOIN course_enrollments e ON e.course_id = c.id AND e.student_id = ?
       WHERE date(l.lecture_date) >= date('now', 'localtime')
       ORDER BY l.lecture_date ASC, l.start_time ASC
       LIMIT 1`,
    )
    .get(session.sub)

  const row =
    upcoming ??
    db
      .prepare(
        `SELECT l.id, l.course_id, l.lecture_date, l.start_time, l.end_time, l.location,
                l.latitude, l.longitude,
                COALESCE(l.allowed_radius_m, 100) AS allowed_radius_m,
                c.course_code, c.course_name
         FROM lectures l
         JOIN courses c ON c.id = l.course_id
         JOIN course_enrollments e ON e.course_id = c.id AND e.student_id = ?
         ORDER BY l.lecture_date DESC, l.start_time DESC
         LIMIT 1`,
      )
      .get(session.sub)

  return NextResponse.json({ lecture: row ?? null })
}
