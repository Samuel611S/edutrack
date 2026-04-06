import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const { id } = await context.params
  const body = await request.json()
  const { email, full_name, student_id, major, gpa, password } = body as Record<string, string | null | undefined>

  const db = getDb()
  const exists = db.prepare("SELECT id FROM students WHERE id = ?").get(id) as { id: string } | undefined
  if (!exists) return NextResponse.json({ message: "Not found" }, { status: 404 })

  const updates: string[] = []
  const values: (string | number | null)[] = []
  if (email !== undefined) {
    updates.push("email = ?")
    values.push(String(email).trim())
  }
  if (full_name !== undefined) {
    updates.push("full_name = ?")
    values.push(String(full_name).trim())
  }
  if (student_id !== undefined) {
    updates.push("student_id = ?")
    values.push(String(student_id).trim())
  }
  if (major !== undefined) {
    updates.push("major = ?")
    values.push(major === "" || major == null ? null : String(major).trim())
  }
  if (gpa !== undefined) {
    updates.push("gpa = ?")
    values.push(gpa === "" || gpa == null ? null : Number(gpa))
  }
  if (password !== undefined && String(password).length > 0) {
    updates.push("password_hash = ?")
    values.push(String(password))
  }

  if (updates.length === 0) {
    return NextResponse.json({ message: "No fields to update" }, { status: 400 })
  }

  try {
    db.prepare(`UPDATE students SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(
      ...values,
      id,
    )
  } catch (e) {
    console.error("[EduTrack] admin patch student:", e)
    return NextResponse.json({ message: "Could not update (duplicate email/id?)" }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "admin") return forbidden()

  const { id } = await context.params
  const db = getDb()
  const res = db.prepare("DELETE FROM students WHERE id = ?").run(id)
  if (res.changes === 0) return NextResponse.json({ message: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true })
}
