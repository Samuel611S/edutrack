import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

const MAX_HANDOUT_BYTES = 5 * 1024 * 1024

function isPdf(file: File, filename: string) {
  const n = filename.toLowerCase()
  const t = (file.type || "").toLowerCase()
  return t.includes("pdf") || n.endsWith(".pdf")
}

export async function GET() {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher" && session.role !== "admin") return forbidden()

  const db = getDb()
  const allAccess = session.role === "admin"

  const rows = db
    .prepare(
      `SELECT a.id, a.course_id, a.title, a.description, a.due_at, a.created_at,
              c.course_code, c.course_name,
              (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id) AS submissions,
              (SELECT h.id FROM assignment_handouts h WHERE h.assignment_id = a.id) AS handout_file_id
       FROM assignments a
       JOIN courses c ON c.id = a.course_id
       WHERE (? = 1 OR c.teacher_id = ?)
       ORDER BY a.created_at DESC`,
    )
    .all(allAccess ? 1 : 0, session.sub) as Record<string, unknown>[]

  return NextResponse.json({ assignments: rows || [] })
}

export async function POST(request: NextRequest) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher" && session.role !== "admin") return forbidden()

  const db = getDb()

  let courseId = ""
  let title = ""
  let description: string | null = null
  let dueAt: string | null = null
  let file: File | null = null

  const ct = request.headers.get("content-type") || ""
  if (ct.includes("multipart/form-data")) {
    const form = await request.formData()
    courseId = String(form.get("courseId") || "")
    title = String(form.get("title") || "").trim()
    description = String(form.get("description") || "").trim() || null
    const d = form.get("dueAt")
    dueAt = d ? String(d) : null
    const f = form.get("file")
    file = f instanceof File && f.size > 0 ? f : null
  } else {
    const body = (await request.json()) as {
      courseId?: string
      title?: string
      description?: string
      dueAt?: string | null
    }
    courseId = String(body.courseId || "")
    title = String(body.title || "").trim()
    description = (body.description || "").trim() || null
    dueAt = body.dueAt || null
  }

  if (!courseId || !title) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
  }

  const course = db
    .prepare("SELECT id, teacher_id FROM courses WHERE id = ?")
    .get(courseId) as { id: string; teacher_id: string } | undefined
  if (!course) return NextResponse.json({ message: "Course not found" }, { status: 404 })
  if (session.role !== "admin" && course.teacher_id !== session.sub) return forbidden()

  if (file) {
    if (file.size > MAX_HANDOUT_BYTES) {
      return NextResponse.json({ message: "Handout PDF too large (max 5MB)" }, { status: 413 })
    }
    const filename = file.name || "assignment.pdf"
    if (!isPdf(file, filename)) {
      return NextResponse.json({ message: "Handout must be a PDF file" }, { status: 400 })
    }
  }

  const id = `asg_${randomUUID().slice(0, 12)}`
  db.prepare(
    `INSERT INTO assignments (id, course_id, title, description, due_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    courseId,
    title,
    description,
    dueAt,
    session.sub,
  )

  if (file) {
    const filename = file.name || "assignment.pdf"
    const buf = Buffer.from(await file.arrayBuffer())
    const hid = `hout_${randomUUID().slice(0, 12)}`
    db.prepare(
      `INSERT INTO assignment_handouts (id, assignment_id, filename, mime_type, size_bytes, data)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(hid, id, filename, file.type || "application/pdf", file.size, buf)
  }

  return NextResponse.json({ success: true, id })
}

