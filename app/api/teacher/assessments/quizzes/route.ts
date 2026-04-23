import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

type QuizQuestionInput = {
  prompt: string
  options: string[]
  correctIndex: number
}

export async function GET() {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher" && session.role !== "admin") return forbidden()

  const db = getDb()
  const allAccess = session.role === "admin"

  const rows = db
    .prepare(
      `SELECT q.id, q.course_id, q.title, q.description, q.open_at, q.due_at, q.created_at,
              c.course_code, c.course_name
       FROM quizzes q
       JOIN courses c ON c.id = q.course_id
       WHERE (? = 1 OR c.teacher_id = ?)
       ORDER BY q.created_at DESC`,
    )
    .all(allAccess ? 1 : 0, session.sub) as any[]

  return NextResponse.json({ quizzes: rows || [] })
}

export async function POST(request: NextRequest) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher" && session.role !== "admin") return forbidden()

  const body = (await request.json()) as {
    courseId?: string
    title?: string
    description?: string
    openAt?: string | null
    dueAt?: string | null
    questions?: QuizQuestionInput[]
  }

  if (!body.courseId || !body.title || !Array.isArray(body.questions) || body.questions.length < 1) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
  }

  const db = getDb()
  const course = db
    .prepare("SELECT id, teacher_id FROM courses WHERE id = ?")
    .get(body.courseId) as { id: string; teacher_id: string } | undefined
  if (!course) return NextResponse.json({ message: "Course not found" }, { status: 404 })
  if (session.role !== "admin" && course.teacher_id !== session.sub) return forbidden()

  const quizId = `quiz_${randomUUID().slice(0, 12)}`
  db.prepare(
    `INSERT INTO quizzes (id, course_id, title, description, open_at, due_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    quizId,
    body.courseId,
    body.title.trim(),
    (body.description || "").trim() || null,
    body.openAt || null,
    body.dueAt || null,
    session.sub,
  )

  const insertQ = db.prepare(
    `INSERT INTO quiz_questions (id, quiz_id, prompt, options_json, correct_index, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )

  body.questions.forEach((q, idx) => {
    const prompt = String(q.prompt || "").trim()
    const options = Array.isArray(q.options) ? q.options.map((o) => String(o || "").trim()).filter(Boolean) : []
    const correct = Number(q.correctIndex)
    if (!prompt || options.length < 2 || !Number.isFinite(correct) || correct < 0 || correct >= options.length) return
    insertQ.run(
      `qq_${randomUUID().slice(0, 12)}`,
      quizId,
      prompt,
      JSON.stringify(options),
      correct,
      idx,
    )
  })

  return NextResponse.json({ success: true, id: quizId })
}

