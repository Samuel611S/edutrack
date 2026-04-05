import { SignJWT, jwtVerify } from "jose"

export type SessionPayload = {
  sub: string
  role: "admin" | "teacher" | "student"
  name: string
}

function getSecret() {
  const s = process.env.AUTH_SECRET ?? "dev-only-change-me-use-long-random-string-32chars-min"
  return new TextEncoder().encode(s)
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret())
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const sub = String(payload.sub ?? "")
    const role = payload.role as SessionPayload["role"]
    const name = String(payload.name ?? "")
    if (!sub || !role || !["admin", "teacher", "student"].includes(role)) return null
    return { sub, role, name }
  } catch {
    return null
  }
}
