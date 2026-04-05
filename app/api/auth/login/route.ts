import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { signSession } from "@/lib/session"
import { setSessionCookie } from "@/lib/api-auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, password, role } = body

    if (!id || !password || !role) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const validatedRole = validateRoleFromId(id, role)
    if (!validatedRole) {
      return NextResponse.json({ message: "ID and role mismatch" }, { status: 400 })
    }

    const db = getDb()
    const user = getUserFromDb(db, validatedRole, id)
    if (!user || user.password_hash !== password) {
      return NextResponse.json({ message: "Invalid ID or password" }, { status: 401 })
    }

    const token = await signSession({
      sub: user.id,
      role: validatedRole,
      name: user.full_name,
    })
    await setSessionCookie(token)

    return NextResponse.json({
      userId: user.id,
      userName: user.full_name,
      role: validatedRole,
      success: true,
    })
  } catch (error) {
    console.error("[EduTrack] Login error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

function validateRoleFromId(id: string, role: string): "admin" | "teacher" | "student" | null {
  if (id.startsWith("02") && role === "admin") return "admin"
  if (id.startsWith("12") && role === "teacher") return "teacher"
  if (id.startsWith("22") && role === "student") return "student"
  return null
}

function getUserFromDb(
  db: ReturnType<typeof getDb>,
  role: "admin" | "teacher" | "student",
  id: string,
): { id: string; full_name: string; password_hash: string } | null {
  if (role === "admin") {
    return (
      db.prepare("SELECT id, full_name, password_hash FROM admins WHERE id = ? LIMIT 1").get(id) ?? null
    )
  }
  if (role === "teacher") {
    return (
      db.prepare("SELECT id, full_name, password_hash FROM teachers WHERE id = ? LIMIT 1").get(id) ?? null
    )
  }
  return db.prepare("SELECT id, full_name, password_hash FROM students WHERE id = ? LIMIT 1").get(id) ?? null
}
