import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") ?? "").trim()
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)
  const pageSize = Math.min(100, Math.max(5, parseInt(searchParams.get("pageSize") ?? "25", 10) || 25))
  const offset = (page - 1) * pageSize

  const db = getDb()
  const pat = `%${q}%`
  const baseFrom = `FROM courses c JOIN teachers t ON t.id = c.teacher_id`
  const where = q
    ? `WHERE (c.course_code LIKE ? OR c.course_name LIKE ? OR c.semester LIKE ? OR t.full_name LIKE ? OR c.id LIKE ? OR IFNULL(c.description,'') LIKE ?)`
    : ""
  const args = q ? [pat, pat, pat, pat, pat, pat] : []

  const total = (db.prepare(`SELECT COUNT(*) AS n ${baseFrom} ${where}`).get(...args) as { n: number }).n
  const rows = db
    .prepare(
      `SELECT c.id, c.course_code, c.course_name, c.description, c.semester, c.credits, c.max_capacity, c.teacher_id, t.full_name AS teacher_name
       ${baseFrom} ${where}
       ORDER BY c.course_code LIMIT ? OFFSET ?`,
    )
    .all(...args, pageSize, offset) as {
    id: string
    course_code: string
    course_name: string
    description: string | null
    semester: string
    credits: number
    max_capacity: number | null
    teacher_id: string
    teacher_name: string
  }[]

  return NextResponse.json({
    courses: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  })
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

  const { description } = body as Record<string, string | number | undefined>
  const id = `course_${randomUUID().slice(0, 8)}`
  try {
    db.prepare(
      `INSERT INTO courses (id, course_code, course_name, description, teacher_id, semester, credits, max_capacity, university_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      course_code,
      course_name,
      description != null && String(description).trim() !== "" ? String(description).trim() : null,
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
