import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

type Params = { params: Promise<{ requestId: string }> }

export async function PATCH(request: NextRequest, context: Params) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher" && session.role !== "admin") return forbidden()

  const { requestId } = await context.params
  const body = await request.json()
  const action = String(body.action || "").trim() as "approve" | "reject"
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ message: "Invalid action" }, { status: 400 })
  }

  const db = getDb()
  const req = db
    .prepare(
      `SELECT r.id, r.student_id, r.course_id, r.request_type, r.status
       FROM enrollment_requests r
       WHERE r.id = ?`,
    )
    .get(requestId) as
    | { id: string; student_id: string; course_id: string; request_type: "add" | "drop"; status: string }
    | undefined

  if (!req) return NextResponse.json({ message: "Request not found" }, { status: 404 })
  if (req.status !== "pending") return NextResponse.json({ message: "Request already processed" }, { status: 400 })

  const tx = db.transaction(() => {
    if (action === "approve") {
      if (req.request_type === "add") {
        const exists = db
          .prepare("SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?")
          .get(req.course_id, req.student_id) as { id: string } | undefined
        if (!exists) {
          db.prepare(
            "INSERT INTO course_enrollments (id, course_id, student_id, enrollment_date) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
          ).run(`enr_${randomUUID().slice(0, 10)}`, req.course_id, req.student_id)
        }
      } else {
        db.prepare("DELETE FROM course_enrollments WHERE course_id = ? AND student_id = ?").run(req.course_id, req.student_id)
      }
    }

    db.prepare(
      `UPDATE enrollment_requests
       SET status = ?, reviewed_by = ?, reviewed_by_role = ?, reviewed_by_name = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    ).run(
      action === "approve" ? "approved" : "rejected",
      session.role === "admin" ? null : session.sub,
      session.role,
      session.name,
      requestId,
    )
  })

  tx()
  return NextResponse.json({ success: true })
}
