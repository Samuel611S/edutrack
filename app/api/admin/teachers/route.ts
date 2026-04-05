import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

export async function GET() {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const db = getDb()
  const rows = db
    .prepare("SELECT id, email, full_name, employee_id, department FROM teachers ORDER BY id")
    .all() as { id: string; email: string; full_name: string; employee_id: string; department: string | null }[]

  return NextResponse.json({ teachers: rows })
}

export async function POST(request: NextRequest) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const body = await request.json()
  const { id, email, full_name, password, employee_id, department } = body as Record<string, string | undefined>
  if (!id || !email || !full_name || !password || !employee_id) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 })
  }
  if (!id.startsWith("12")) {
    return NextResponse.json({ message: "Teacher id must start with 12" }, { status: 400 })
  }

  const db = getDb()
  const uni = db.prepare("SELECT university_id FROM admins WHERE id = ?").get(session.sub) as
    | { university_id: string }
    | undefined
  const university_id = uni?.university_id ?? "aou_cairo"

  try {
    db.prepare(
      `INSERT INTO teachers (id, email, full_name, password_hash, employee_id, department, university_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, email, full_name, password, employee_id, department ?? null, university_id)
  } catch {
    return NextResponse.json({ message: "Could not create teacher (duplicate id/email?)" }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
