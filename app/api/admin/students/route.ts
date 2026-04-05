import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

export async function GET() {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const db = getDb()
  const rows = db
    .prepare(
      "SELECT id, email, full_name, student_id, major, gpa FROM students ORDER BY id",
    )
    .all() as { id: string; email: string; full_name: string; student_id: string; major: string | null; gpa: number | null }[]

  return NextResponse.json({ students: rows })
}

export async function POST(request: NextRequest) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const body = await request.json()
  const { id, email, full_name, password, student_id, major, gpa } = body as Record<string, string | undefined>
  if (!id || !email || !full_name || !password || !student_id) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 })
  }
  if (!id.startsWith("22")) {
    return NextResponse.json({ message: "Student id must start with 22" }, { status: 400 })
  }

  const db = getDb()
  const uni = db.prepare("SELECT university_id FROM admins WHERE id = ?").get(session.sub) as
    | { university_id: string }
    | undefined
  const university_id = uni?.university_id ?? "edutrack_main"

  try {
    db.prepare(
      `INSERT INTO students (id, email, full_name, password_hash, student_id, major, gpa, university_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      email,
      full_name,
      password,
      student_id,
      major ?? null,
      gpa != null && gpa !== "" ? Number(gpa) : null,
      university_id,
    )
  } catch {
    return NextResponse.json({ message: "Could not create student (duplicate id/email?)" }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
