import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"
import { parseQuizDraft } from "@/lib/quiz-draft-parser"
import { parseDeadlineMs } from "@/lib/time-format"

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
    .all(allAccess ? 1 : 0, session.sub) as Record<string, unknown>[]

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
    quizDraft?: string
    answerKey?: string
  }

  let questions: QuizQuestionInput[] = Array.isArray(body.questions) ? body.questions : []
  const draft = typeof body.quizDraft === "string" ? body.quizDraft.trim() : ""
  const answerKey = typeof body.answerKey === "string" ? body.answerKey.trim() : ""
  if (draft && answerKey) {
    try {
      const parsed = parseQuizDraft(draft, answerKey)
      questions = parsed.map((q) => ({
        prompt: q.prompt,
        options: q.options,
        correctIndex: q.correctIndex,
      }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid quiz draft"
      return NextResponse.json({ message: msg }, { status: 400 })
    }
  }

  if (!body.courseId || !body.title || !questions.length) {
    return NextResponse.json(
      { message: "Missing required fields (title + either questions[] or quizDraft + answerKey)" },
      { status: 400 },
    )
  }

  const dueRaw = body.dueAt != null && String(body.dueAt).trim() !== "" ? String(body.dueAt).trim() : null
  if (!dueRaw) {
    return NextResponse.json({ message: "Answer deadline (date and time) is required." }, { status: 400 })
  }
  const dueMs = parseDeadlineMs(dueRaw)
  if (dueMs === null) {
    return NextResponse.json({ message: "Invalid answer deadline." }, { status: 400 })
  }

  let openAtOut: string | null = null
  if (body.openAt != null && String(body.openAt).trim() !== "") {
    const o = parseDeadlineMs(String(body.openAt).trim())
    openAtOut = o !== null ? new Date(o).toISOString() : null
  }
  const dueAtOut = new Date(dueMs).toISOString()

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
    openAtOut,
    dueAtOut,
    session.sub,
  )

  const insertQ = db.prepare(
    `INSERT INTO quiz_questions (id, quiz_id, prompt, options_json, correct_index, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )

  let inserted = 0
  questions.forEach((q, idx) => {
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
    inserted++
  })

  if (inserted === 0) {
    db.prepare("DELETE FROM quizzes WHERE id = ?").run(quizId)
    return NextResponse.json({ message: "No valid questions were saved (check prompts, choices, and answer key)." }, { status: 400 })
  }

  return NextResponse.json({ success: true, id: quizId })
}

