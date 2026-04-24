import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"
import { minutesBetweenSameDay } from "@/lib/lecture-duration"

export async function POST(request: NextRequest) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "teacher" && session.role !== "admin") return forbidden()

  const body = await request.json()
  const {
    courseId,
    lectureDate,
    startTime,
    endTime,
    location,
    latitude,
    longitude,
    allowedRadiusM,
  } = body as Record<string, string | number | undefined>

  if (!courseId || !lectureDate || !location || latitude === undefined || longitude === undefined) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
  }

  const st = typeof startTime === "string" ? startTime : ""
  const et = typeof endTime === "string" ? endTime : ""
  if (!st || !et) {
    return NextResponse.json({ message: "Start time and end time are required" }, { status: 400 })
  }

  const duration = minutesBetweenSameDay(st, et)
  if (duration === null || duration <= 0 || duration > 6 * 60) {
    return NextResponse.json(
      {
        message: "Lecture time must be valid on the same day (end after start).",
      },
      { status: 400 },
    )
  }

  const db = getDb()
  const course = session.role === "admin"
    ? (db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId) as { id: string } | undefined)
    : (db.prepare("SELECT id FROM courses WHERE id = ? AND teacher_id = ?").get(courseId, session.sub) as
        | { id: string }
        | undefined)
  if (!course) return NextResponse.json({ message: "Course not found" }, { status: 404 })

  const id = `lec_${randomUUID().slice(0, 12)}`
  const radius = allowedRadiusM != null ? Number(allowedRadiusM) : 100

  db.prepare(
    `INSERT INTO lectures (id, course_id, lecture_date, start_time, end_time, location, latitude, longitude, allowed_radius_m)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    courseId,
    lectureDate,
    startTime ?? null,
    endTime ?? null,
    location,
    Number(latitude),
    Number(longitude),
    radius,
  )

  return NextResponse.json({ success: true, id })
}
