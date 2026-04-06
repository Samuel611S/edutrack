import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getSessionUser, forbidden, unauthorized } from "@/lib/api-auth"
import { haversineMeters } from "@/lib/geo"
import { randomUUID } from "node:crypto"

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session) return unauthorized()
    if (session.role !== "student") return forbidden()

    const body = await request.json()
    const {
      lectureId,
      latitude,
      longitude,
      faceVerified,
      timeInSection,
      outsideRadiusSeconds,
    } = body as {
      lectureId?: string
      latitude?: number
      longitude?: number
      faceVerified?: boolean
      timeInSection?: number
      outsideRadiusSeconds?: number
    }

    if (!lectureId || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const db = getDb()
    const lecture = db
      .prepare(
        `SELECT l.id, l.latitude, l.longitude, l.allowed_radius_m, c.id as course_id
         FROM lectures l
         JOIN courses c ON c.id = l.course_id
         JOIN course_enrollments e ON e.course_id = c.id AND e.student_id = ?
         WHERE l.id = ?`,
      )
      .get(session.sub, lectureId) as
      | {
          id: string
          latitude: number | null
          longitude: number | null
          allowed_radius_m: number | null
          course_id: string
        }
      | undefined

    if (!lecture) {
      return NextResponse.json({ message: "Lecture not found or you are not enrolled" }, { status: 404 })
    }

    if (lecture.latitude == null || lecture.longitude == null) {
      return NextResponse.json({ message: "Lecture location is not configured" }, { status: 400 })
    }

    const radius = Number(lecture.allowed_radius_m ?? 100)
    const distance = haversineMeters(latitude, longitude, Number(lecture.latitude), Number(lecture.longitude))

    if (distance > radius) {
      return NextResponse.json(
        {
          success: false,
          message: `You are outside the allowed area (${Math.round(distance)}m from lecture; max ${radius}m).`,
          verifiedLocation: false,
          distanceMeters: Math.round(distance),
        },
        { status: 403 },
      )
    }

    const faceOk = Boolean(faceVerified)
    const timeSec = typeof timeInSection === "number" && !Number.isNaN(timeInSection) ? Math.floor(timeInSection) : null

    const id = `att_${randomUUID()}`
    const existing = db
      .prepare("SELECT id FROM attendance WHERE lecture_id = ? AND student_id = ?")
      .get(lectureId, session.sub) as { id: string } | undefined

    if (existing) {
      db.prepare(
        `UPDATE attendance SET
          check_in_time = COALESCE(check_in_time, datetime('now')),
          check_out_time = datetime('now'),
          location_verified = 1,
          student_latitude = ?,
          student_longitude = ?,
          distance_from_lecture = ?,
          face_verified = ?,
          time_in_section_sec = COALESCE(?, time_in_section_sec),
          outside_radius_sec = ?,
          status = 'present'
        WHERE lecture_id = ? AND student_id = ?`,
      ).run(
        latitude,
        longitude,
        Math.round(distance * 100) / 100,
        faceOk ? 1 : 0,
        timeSec,
        outsideSec,
        lectureId,
        session.sub,
      )
    } else {
      db.prepare(
        `INSERT INTO attendance (
          id, lecture_id, student_id, check_in_time, location_verified,
          student_latitude, student_longitude, distance_from_lecture,
          face_verified, time_in_section_sec, outside_radius_sec, status
        ) VALUES (?, ?, ?, datetime('now'), 1, ?, ?, ?, ?, ?, ?, 'present')`,
      ).run(
        id,
        lectureId,
        session.sub,
        latitude,
        longitude,
        Math.round(distance * 100) / 100,
        faceOk ? 1 : 0,
        timeSec,
        outsideSec,
      )
    }

    return NextResponse.json({
      success: true,
      message: "Attendance marked successfully",
      data: {
        lectureId,
        studentId: session.sub,
        status: "present",
        verifiedLocation: true,
        distanceMeters: Math.round(distance),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[EduTrack] Attendance marking error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
