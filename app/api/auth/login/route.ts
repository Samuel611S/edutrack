import { type NextRequest, NextResponse } from "next/server"

// Mock user data - In production, query the database
const mockUsers: Record<string, Record<string, any>> = {
  admin: {
    "02511793": {
      id: "admin_001",
      name: "System Administrator",
      userId: "02511793",
      password: "12345678",
    },
  },
  teacher: {
    "12511793": {
      id: "teacher_001",
      name: "Teacher Account",
      userId: "12511793",
      password: "12345678",
    },
  },
  student: {
    "22511793": {
      id: "student_001",
      name: "Student Account",
      userId: "22511793",
      password: "12345678",
    },
  },
}

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

    const users = mockUsers[validatedRole as keyof typeof mockUsers]
    if (!users) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 })
    }

    const user = users[id]
    if (!user || user.password !== password) {
      return NextResponse.json({ message: "Invalid ID or password" }, { status: 401 })
    }

    // In production, create a proper JWT token
    const token = Buffer.from(JSON.stringify({ id: user.id, role: validatedRole, userId: id })).toString("base64")

    return NextResponse.json({
      token,
      userId: user.userId,
      userName: user.name,
      role: validatedRole,
      success: true,
    })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

function validateRoleFromId(id: string, role: string): string | null {
  if (id.startsWith("02") && role === "admin") return "admin"
  if (id.startsWith("12") && role === "teacher") return "teacher"
  if (id.startsWith("22") && role === "student") return "student"
  return null
}
