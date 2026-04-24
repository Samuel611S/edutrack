import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getAdminUniversityId } from "@/lib/admin-university"
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
  const universityId = getAdminUniversityId(session.sub)

  const db = getDb()
  const pat = `%${q}%`
  const where = q
    ? "WHERE university_id = ? AND (id LIKE ? OR email LIKE ? OR full_name LIKE ? OR employee_id LIKE ? OR IFNULL(department,'') LIKE ?)"
    : "WHERE university_id = ?"
  const args = q ? [universityId, pat, pat, pat, pat, pat] : [universityId]

  const total = (
    db.prepare(`SELECT COUNT(*) AS n FROM teachers ${where}`).get(...args) as { n: number }
  ).n
  const rows = db
    .prepare(`SELECT id, email, full_name, employee_id, department FROM teachers ${where} ORDER BY id LIMIT ? OFFSET ?`)
    .all(...args, pageSize, offset) as {
    id: string
    email: string
    full_name: string
    employee_id: string
    department: string | null
  }[]

  return NextResponse.json({
    teachers: rows,
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
  const { id, email, full_name, password, employee_id, department } = body as Record<string, string | undefined>
  if (!id || !email || !full_name || !password || !employee_id) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 })
  }
  if (!id.startsWith("12")) {
    return NextResponse.json({ message: "Teacher id must start with 12" }, { status: 400 })
  }

  const db = getDb()
  const university_id = getAdminUniversityId(session.sub)

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
