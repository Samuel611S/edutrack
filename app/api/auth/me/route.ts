import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/api-auth"

export async function GET() {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.sub,
      name: session.name,
      role: session.role,
    },
  })
}
