import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

type Params = { params: Promise<{ courseId: string }> }

export async function PATCH(request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher" && session.role !== "admin") return forbidden()

  const { courseId } = await context.params
  const body = await request.json()
  const grades = body?.grades as Record<string, string> | undefined
  if (!grades || typeof grades !== "object") {
    return NextResponse.json({ message: "grades object required" }, { status: 400 })
  }

  const db = getDb()
  const own = session.role === "admin"
    ? (db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId) as { id: string } | undefined)
    : (db.prepare("SELECT id FROM courses WHERE id = ? AND teacher_id = ?").get(courseId, session.sub) as
        | { id: string }
        | undefined)
  if (!own) return NextResponse.json({ message: "Course not found" }, { status: 404 })

  const updateStmt = db.prepare("UPDATE course_enrollments SET grade = ? WHERE id = ? AND course_id = ?")

  const run = db.transaction(() => {
    for (const [enrollmentId, raw] of Object.entries(grades)) {
      const g = raw == null ? "" : String(raw).trim()
      const gradeValue = g === "" ? null : g
      const res = updateStmt.run(gradeValue, enrollmentId, courseId)
      if (res.changes === 0) {
        throw new Error(`Invalid enrollment: ${enrollmentId}`)
      }
    }
  })

  try {
    run()
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed"
    return NextResponse.json({ message: msg }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
