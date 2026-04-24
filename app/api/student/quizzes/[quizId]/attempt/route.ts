import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"
import { parseDeadlineMs } from "@/lib/time-format"

export async function POST(request: NextRequest, ctx: { params: Promise<{ quizId: string }> }) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "student") return forbidden()

  const { quizId } = await ctx.params
  const body = (await request.json()) as { answers?: Record<string, number> }
  const answers = body.answers || {}

  const db = getDb()

  const quiz = db
    .prepare(
      `SELECT q.id, q.course_id, q.due_at
       FROM quizzes q
       JOIN course_enrollments e ON e.course_id = q.course_id AND e.student_id = ?
       WHERE q.id = ?`,
    )
    .get(session.sub, quizId) as { id: string; course_id: string; due_at: string | null } | undefined
  if (!quiz) return NextResponse.json({ message: "Quiz not found" }, { status: 404 })

  const dueMs = parseDeadlineMs(quiz.due_at)
  if (dueMs !== null && Date.now() > dueMs) {
    return NextResponse.json({ message: "The answer deadline has passed. Submissions are closed." }, { status: 403 })
  }

  const qs = db
    .prepare(`SELECT id, correct_index FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order ASC`)
    .all(quizId) as { id: string; correct_index: number }[]

  if (!qs.length) return NextResponse.json({ message: "Quiz has no questions" }, { status: 400 })

  let score = 0
  const max = qs.length
  for (const q of qs) {
    const a = answers[q.id]
    if (typeof a === "number" && Number.isFinite(a) && a === Number(q.correct_index)) score++
  }

  const existing = db
    .prepare("SELECT id FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?")
    .get(quizId, session.sub) as { id: string } | undefined

  const answersJson = JSON.stringify(answers)
  if (existing) {
    db.prepare(
      `UPDATE quiz_attempts
       SET submitted_at = datetime('now'), answers_json = ?, score = ?, max_score = ?
       WHERE id = ?`,
    ).run(answersJson, score, max, existing.id)
  } else {
    db.prepare(
      `INSERT INTO quiz_attempts (id, quiz_id, student_id, answers_json, score, max_score)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(`qat_${randomUUID().slice(0, 12)}`, quizId, session.sub, answersJson, score, max)
  }

  return NextResponse.json({ success: true, score, max })
}

