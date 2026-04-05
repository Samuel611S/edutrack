import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { verifySession, type SessionPayload } from "@/lib/session"

const COOKIE = "edutrack_session"

export async function getSessionUser(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}

export async function setSessionCookie(token: string) {
  const store = await cookies()
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
}

export function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ message: "Forbidden" }, { status: 403 })
}

export function requireRole(session: SessionPayload | null, roles: SessionPayload["role"][]) {
  if (!session) return false
  return roles.includes(session.role)
}
