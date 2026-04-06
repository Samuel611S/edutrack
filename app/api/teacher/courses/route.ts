import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

export async function POST(request: NextRequest) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher") return forbidden()

  const body = await request.json()
  const { course_code, course_name, description, semester, credits, max_capacity } = body as Record<
    string,
    string | number | null | undefined
  >
  if (!course_code || !course_name || !semester) {
    return NextResponse.json({ message: "course_code, course_name, and semester are required" }, { status: 400 })
  }

  const db = getDb()
  const teacher = db.prepare("SELECT university_id FROM teachers WHERE id = ?").get(session.sub) as
    | { university_id: string }
    | undefined
  if (!teacher) return NextResponse.json({ message: "Teacher not found" }, { status: 404 })

  const id = `course_${randomUUID().slice(0, 10)}`
  try {
    db.prepare(
      `INSERT INTO courses (id, course_code, course_name, description, teacher_id, semester, credits, max_capacity, university_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      String(course_code).trim(),
      String(course_name).trim(),
      description != null && String(description).trim() !== "" ? String(description).trim() : null,
      session.sub,
      String(semester).trim(),
      credits != null ? Number(credits) : 3,
      max_capacity != null && max_capacity !== "" ? Number(max_capacity) : null,
      teacher.university_id,
    )
  } catch (e) {
    console.error("[EduTrack] Teacher create course:", e)
    return NextResponse.json({ message: "Could not create course (duplicate code?)" }, { status: 400 })
  }

  return NextResponse.json({ success: true, id })
}
