import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

export async function GET() {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const db = getDb()
  const rows = db
    .prepare(
      `SELECT c.id, c.course_code, c.course_name, c.semester, c.teacher_id, t.full_name AS teacher_name
       FROM courses c
       JOIN teachers t ON t.id = c.teacher_id
       ORDER BY c.course_code`,
    )
    .all() as {
    id: string
    course_code: string
    course_name: string
    semester: string
    teacher_id: string
    teacher_name: string
  }[]

  return NextResponse.json({ courses: rows })
}

export async function POST(request: NextRequest) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const body = await request.json()
  const { course_code, course_name, teacher_id, semester, credits, max_capacity } = body as Record<
    string,
    string | number | undefined
  >
  if (!course_code || !course_name || !teacher_id || !semester) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 })
  }

  const db = getDb()
  const uni = db.prepare("SELECT university_id FROM admins WHERE id = ?").get(session.sub) as
    | { university_id: string }
    | undefined
  const university_id = uni?.university_id ?? "edutrack_main"

  const id = `course_${randomUUID().slice(0, 8)}`
  try {
    db.prepare(
      `INSERT INTO courses (id, course_code, course_name, teacher_id, semester, credits, max_capacity, university_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      course_code,
      course_name,
      teacher_id,
      semester,
      credits != null ? Number(credits) : 3,
      max_capacity != null ? Number(max_capacity) : null,
      university_id,
    )
  } catch {
    return NextResponse.json({ message: "Could not create course" }, { status: 400 })
  }

  return NextResponse.json({ success: true, id })
}
