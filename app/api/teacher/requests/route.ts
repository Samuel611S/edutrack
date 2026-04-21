import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

export async function GET() {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher" && session.role !== "admin") return forbidden()

  const db = getDb()
  const rows = db
    .prepare(
      `SELECT r.id, r.batch_id, r.request_type, r.status, r.is_overload, r.reason, r.created_at,
              s.id AS student_id, s.full_name AS student_name, s.student_id AS student_code,
              c.id AS course_id, c.course_code, c.course_name, c.semester,
              COALESCE(r.reviewed_by_name, t.full_name) AS reviewed_by_name,
              r.reviewed_by_role
       FROM enrollment_requests r
       JOIN students s ON s.id = r.student_id
       JOIN courses c ON c.id = r.course_id
       LEFT JOIN teachers t ON t.id = r.reviewed_by
       ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.created_at DESC`,
    )
    .all()

  return NextResponse.json({ requests: rows })
}
