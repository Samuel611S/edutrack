import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

const MAX_BYTES = 5 * 1024 * 1024

function isPdf(file: File, filename: string) {
  const n = filename.toLowerCase()
  const t = (file.type || "").toLowerCase()
  return t.includes("pdf") || n.endsWith(".pdf")
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ assignmentId: string }> }) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "student") return forbidden()

  const { assignmentId } = await ctx.params
  const db = getDb()

  const assignment = db
    .prepare(
      `SELECT a.id, a.course_id
       FROM assignments a
       JOIN course_enrollments e ON e.course_id = a.course_id AND e.student_id = ?
       WHERE a.id = ?`,
    )
    .get(session.sub, assignmentId) as { id: string; course_id: string } | undefined
  if (!assignment) return NextResponse.json({ message: "Assignment not found" }, { status: 404 })

  const form = await request.formData()
  const note = String(form.get("note") || "").trim()
  const file = form.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "File is required" }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ message: "File too large (max 5MB)" }, { status: 413 })
  }

  const filename = file.name || "submission.pdf"
  if (!isPdf(file, filename)) {
    return NextResponse.json({ message: "Please upload your answers as a PDF file" }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const mime = file.type || "application/pdf"

  const existing = db
    .prepare("SELECT id FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?")
    .get(assignmentId, session.sub) as { id: string } | undefined

  const submissionId = existing?.id ?? `sub_${randomUUID().slice(0, 12)}`
  if (existing) {
    db.prepare(
      `UPDATE assignment_submissions
       SET note = ?, submitted_at = datetime('now')
       WHERE id = ?`,
    ).run(note || null, submissionId)
    db.prepare("DELETE FROM submission_files WHERE submission_id = ?").run(submissionId)
  } else {
    db.prepare(
      `INSERT INTO assignment_submissions (id, assignment_id, student_id, note)
       VALUES (?, ?, ?, ?)`,
    ).run(submissionId, assignmentId, session.sub, note || null)
  }

  const fileId = `file_${randomUUID().slice(0, 12)}`
  db.prepare(
    `INSERT INTO submission_files (id, submission_id, filename, mime_type, size_bytes, data)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(fileId, submissionId, filename, mime, file.size, buf)

  return NextResponse.json({ success: true, submissionId, fileId })
}

