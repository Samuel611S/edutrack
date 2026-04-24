import { NextResponse, type NextRequest } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"
import { parseDeadlineMs } from "@/lib/time-format"

export async function GET(_: NextRequest, ctx: { params: Promise<{ quizId: string }> }) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "student") return forbidden()

  const { quizId } = await ctx.params
  const db = getDb()

  const quiz = db
    .prepare(
      `SELECT q.id, q.course_id, q.title, q.description, q.open_at, q.due_at,
              c.course_code, c.course_name,
              (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_id = ?) AS attempt_count
       FROM quizzes q
       JOIN courses c ON c.id = q.course_id
       JOIN course_enrollments e ON e.course_id = c.id AND e.student_id = ?
       WHERE q.id = ?`,
    )
    .get(session.sub, session.sub, quizId) as Record<string, unknown> | undefined

  if (!quiz) return NextResponse.json({ message: "Quiz not found" }, { status: 404 })

  const dueMs = parseDeadlineMs(quiz.due_at)
  const attempted = Number(quiz.attempt_count) > 0
  if (dueMs !== null && Date.now() > dueMs && !attempted) {
    return NextResponse.json({ message: "This quiz is no longer available. The answer deadline has passed." }, { status: 403 })
  }

  const quizOut = { ...(quiz as Record<string, unknown>) }
  delete quizOut.attempt_count

  const questions = db
    .prepare(`SELECT id, prompt, options_json, sort_order FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order ASC`)
    .all(quizId) as { id: string; prompt: string; options_json: string; sort_order: number }[]

  return NextResponse.json({
    quiz: quizOut,
    questions: questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: JSON.parse(q.options_json || "[]"),
    })),
  })
}

