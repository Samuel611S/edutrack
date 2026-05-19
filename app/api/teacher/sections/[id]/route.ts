import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getSessionUser, unauthorized } from "@/lib/api-auth"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser()
    if (!session || session.role !== "teacher") {
      return unauthorized()
    }

    const body = await req.json()
    const { section_name, latitude, longitude, description } = body

    const db = getDb()

    // Verify ownership
    const section = db.prepare(`
      SELECT id, teacher_id, latitude, longitude FROM teacher_sections WHERE id = ?
    `).get(params.id)

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }

    if (section.teacher_id !== session.sub) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Validate coordinates if provided
    if (latitude !== undefined || longitude !== undefined) {
      const lat = latitude !== undefined ? latitude : section.latitude
      const lng = longitude !== undefined ? longitude : section.longitude

      if (typeof lat !== "number" || typeof lng !== "number") {
        return NextResponse.json(
          { error: "latitude and longitude must be numbers" },
          { status: 400 }
        )
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return NextResponse.json(
          { error: 'Invalid coordinates' },
          { status: 400 }
        )
      }
    }

    const now = new Date().toISOString()

    try {
      db.prepare(`
        UPDATE teacher_sections
        SET 
          section_name = COALESCE(?, section_name),
          latitude = COALESCE(?, latitude),
          longitude = COALESCE(?, longitude),
          description = COALESCE(?, description),
          updated_at = ?
        WHERE id = ? AND teacher_id = ?
      `).run(
        section_name || null,
        latitude !== undefined ? latitude : null,
        longitude !== undefined ? longitude : null,
        description !== undefined ? description : null,
        now,
        params.id,
        session.sub
      )

      const updatedSection = db.prepare(`
        SELECT id, section_name, latitude, longitude, description, created_at, updated_at
        FROM teacher_sections
        WHERE id = ?
      `).get(params.id)

      return NextResponse.json({ section: updatedSection })
    } catch (dbError: any) {
      if (dbError.message.includes("UNIQUE constraint failed")) {
        return NextResponse.json(
          { error: `Section "${section_name}" already exists` },
          { status: 409 }
        )
      }
      throw dbError
    }
  } catch (error) {
    console.error("Failed to update section:", error)
    return NextResponse.json(
      { error: "Failed to update section" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser()
    if (!session || session.role !== "teacher") {
      return unauthorized()
    }

    const db = getDb()

    // Verify ownership
    const section = db.prepare(`
      SELECT id, teacher_id FROM teacher_sections WHERE id = ?
    `).get(params.id)

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }

    if (section.teacher_id !== session.sub) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    db.prepare("DELETE FROM teacher_sections WHERE id = ?").run(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete section:", error)
    return NextResponse.json(
      { error: "Failed to delete section" },
      { status: 500 }
    )
  }
}
