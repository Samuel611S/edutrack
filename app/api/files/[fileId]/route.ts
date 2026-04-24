import { NextResponse, type NextRequest } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

export async function GET(_: NextRequest, ctx: { params: Promise<{ fileId: string }> }) {
  const session = await getSessionUser()
  if (!session) return unauthorized()

  const { fileId } = await ctx.params
  const db = getDb()

  let row = db
    .prepare(
      `SELECT f.id, f.filename, f.mime_type, f.data,
              s.student_id AS student_id,
              c.teacher_id,
              'submission' AS kind,
              0 AS student_enrolled
       FROM submission_files f
       JOIN assignment_submissions s ON s.id = f.submission_id
       JOIN assignments a ON a.id = s.assignment_id
       JOIN courses c ON c.id = a.course_id
       WHERE f.id = ?`,
    )
    .get(fileId) as
    | {
        id: string
        filename: string
        mime_type: string | null
        data: Buffer
        student_id: string | null
        teacher_id: string
        kind: string
        student_enrolled: number
      }
    | undefined

  if (!row) {
    row = db
      .prepare(
        `SELECT h.id, h.filename, h.mime_type, h.data,
                NULL AS student_id,
                c.teacher_id,
                'handout' AS kind,
                CASE
                  WHEN EXISTS (
                    SELECT 1 FROM course_enrollments e
                    WHERE e.course_id = a.course_id AND e.student_id = ?
                  ) THEN 1 ELSE 0
                END AS student_enrolled
         FROM assignment_handouts h
         JOIN assignments a ON a.id = h.assignment_id
         JOIN courses c ON c.id = a.course_id
         WHERE h.id = ?`,
      )
      .get(session.sub, fileId) as typeof row
  }

  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 })

  const can =
    session.role === "admin" ||
    (session.role === "teacher" && session.sub === row.teacher_id) ||
    (session.role === "student" && row.kind === "submission" && row.student_id != null && session.sub === row.student_id) ||
    (session.role === "student" && row.kind === "handout" && row.student_enrolled === 1)
  if (!can) return forbidden()

  return new NextResponse(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(row.filename)}"`,
      "Cache-Control": "no-store",
    },
  })
}

