import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"
import { parseDeadlineMs } from "@/lib/time-format"

export async function GET() {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "student") return forbidden()

  const db = getDb()

  type QuizListRow = Record<string, unknown>
  type AssignmentListRow = Record<string, unknown>

  const quizzes = db
    .prepare(
      `SELECT q.id, q.course_id, q.title, q.description, q.open_at, q.due_at, q.created_at,
              c.course_code, c.course_name,
              (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count,
              (SELECT score FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_id = ?) AS my_score,
              (SELECT max_score FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_id = ?) AS my_max
       FROM quizzes q
       JOIN courses c ON c.id = q.course_id
       JOIN course_enrollments e ON e.course_id = c.id AND e.student_id = ?
       ORDER BY q.created_at DESC`,
    )
    .all(session.sub, session.sub, session.sub) as QuizListRow[]

  const now = Date.now()
  const visibleQuizzes = quizzes.filter((q) => {
    const dueMs = parseDeadlineMs(q.due_at)
    if (dueMs === null) return true
    if (now <= dueMs) return true
    const attempted = q.my_score != null || q.my_max != null
    return attempted
  })

  const assignments = db
    .prepare(
      `SELECT a.id, a.course_id, a.title, a.description, a.due_at, a.created_at,
              c.course_code, c.course_name,
              (SELECT submitted_at FROM assignment_submissions s WHERE s.assignment_id = a.id AND s.student_id = ?) AS submitted_at,
              (SELECT h.id FROM assignment_handouts h WHERE h.assignment_id = a.id) AS handout_file_id
       FROM assignments a
       JOIN courses c ON c.id = a.course_id
       JOIN course_enrollments e ON e.course_id = c.id AND e.student_id = ?
       ORDER BY a.created_at DESC`,
    )
    .all(session.sub, session.sub) as AssignmentListRow[]

  return NextResponse.json({ quizzes: visibleQuizzes || [], assignments: assignments || [] })
}

