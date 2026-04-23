import { NextResponse, type NextRequest } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

export async function GET(_: NextRequest, ctx: { params: Promise<{ fileId: string }> }) {
  const session = await getSessionUser()
  if (!session) return unauthorized()

  const { fileId } = await ctx.params
  const db = getDb()

  const row = db
    .prepare(
      `SELECT f.id, f.filename, f.mime_type, f.data,
              s.student_id, a.course_id, c.teacher_id
       FROM submission_files f
       JOIN assignment_submissions s ON s.id = f.submission_id
       JOIN assignments a ON a.id = s.assignment_id
       JOIN courses c ON c.id = a.course_id
       WHERE f.id = ?`,
    )
    .get(fileId) as
    | { id: string; filename: string; mime_type: string | null; data: Buffer; student_id: string; teacher_id: string }
    | undefined

  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 })

  const can =
    session.role === "admin" ||
    (session.role === "student" && session.sub === row.student_id) ||
    (session.role === "teacher" && session.sub === row.teacher_id)
  if (!can) return forbidden()

  return new NextResponse(row.data, {
    headers: {
      "Content-Type": row.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(row.filename)}"`,
      "Cache-Control": "no-store",
    },
  })
}

