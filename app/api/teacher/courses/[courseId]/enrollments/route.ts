import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

type Params = { params: Promise<{ courseId: string }> }

export async function PATCH(request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher" && session.role !== "admin") return forbidden()

  const { courseId } = await context.params
  const body = await request.json()
  const action = String(body.action || "").trim() as "add" | "remove"
  const studentId = String(body.studentId || "").trim()
  if (!studentId || (action !== "add" && action !== "remove")) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
  }

  const db = getDb()
  const ownCourse = session.role === "admin"
    ? (db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId) as { id: string } | undefined)
    : (db.prepare("SELECT id FROM courses WHERE id = ? AND teacher_id = ?").get(courseId, session.sub) as
        | { id: string }
        | undefined)
  if (!ownCourse) return NextResponse.json({ message: "Course not found" }, { status: 404 })

  const studentExists = db.prepare("SELECT id FROM students WHERE id = ?").get(studentId) as { id: string } | undefined
  if (!studentExists) return NextResponse.json({ message: "Student not found" }, { status: 404 })

  if (action === "add") {
    const exists = db
      .prepare("SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?")
      .get(courseId, studentId) as { id: string } | undefined
    if (!exists) {
      db.prepare("INSERT INTO course_enrollments (id, course_id, student_id) VALUES (?, ?, ?)").run(
        `enr_${randomUUID().slice(0, 10)}`,
        courseId,
        studentId,
      )
    }
  } else {
    db.prepare("DELETE FROM course_enrollments WHERE course_id = ? AND student_id = ?").run(courseId, studentId)
  }

  return NextResponse.json({ success: true })
}
