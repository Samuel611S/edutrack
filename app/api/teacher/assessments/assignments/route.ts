import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

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
              (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id) AS submissions
       FROM assignments a
       JOIN courses c ON c.id = a.course_id
       WHERE (? = 1 OR c.teacher_id = ?)
       ORDER BY a.created_at DESC`,
    )
    .all(allAccess ? 1 : 0, session.sub) as any[]

  return NextResponse.json({ assignments: rows || [] })
}

export async function POST(request: NextRequest) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher" && session.role !== "admin") return forbidden()

  const body = (await request.json()) as {
    courseId?: string
    title?: string
    description?: string
    dueAt?: string | null
  }

  if (!body.courseId || !body.title) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
  }

  const db = getDb()
  const course = db
    .prepare("SELECT id, teacher_id FROM courses WHERE id = ?")
    .get(body.courseId) as { id: string; teacher_id: string } | undefined
  if (!course) return NextResponse.json({ message: "Course not found" }, { status: 404 })
  if (session.role !== "admin" && course.teacher_id !== session.sub) return forbidden()

  const id = `asg_${randomUUID().slice(0, 12)}`
  db.prepare(
    `INSERT INTO assignments (id, course_id, title, description, due_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.courseId,
    body.title.trim(),
    (body.description || "").trim() || null,
    body.dueAt || null,
    session.sub,
  )

  return NextResponse.json({ success: true, id })
}

