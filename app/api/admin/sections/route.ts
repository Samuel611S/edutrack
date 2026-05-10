import { NextRequest, NextResponse } from 'next/server'
import { getDb, logChange } from '@/lib/db'
import { forbidden, getSessionUser, unauthorized } from '@/lib/api-auth'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session) return unauthorized()
    if (session.role !== "admin") return forbidden()

    const db = getDb()
    const sections = db.prepare(`
      SELECT id, section_name, latitude, longitude, description, created_at, updated_at
      FROM teacher_sections
      ORDER BY created_at DESC
    `).all()

    return NextResponse.json({ sections })
  } catch (error) {
    console.error('Failed to fetch sections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session) return unauthorized()
    if (session.role !== "admin") return forbidden()

    const body = await req.json()
    const { section_name, latitude, longitude, description } = body

    // Validate input
    if (!section_name || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'section_name, latitude, and longitude are required' },
        { status: 400 }
      )
    }

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'latitude and longitude must be numbers' },
        { status: 400 }
      )
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      )
    }

    const db = getDb()
    const id = randomUUID()
    const now = new Date().toISOString()

    try {
      db.prepare(`
        INSERT INTO teacher_sections (id, teacher_id, section_name, latitude, longitude, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, session.sub, section_name, latitude, longitude, description || null, now, now)

      // Log the change
      logChange(db, session.sub, session.role, "section_added", JSON.stringify({
        section_id: id,
        section_name,
        latitude,
        longitude,
        description,
      }), "section", id)

      const section = db.prepare(`
        SELECT id, section_name, latitude, longitude, description, created_at, updated_at
        FROM teacher_sections
        WHERE id = ?
      `).get(id)

      return NextResponse.json({ section }, { status: 201 })
    } catch (dbError: any) {
      if (dbError.message.includes('UNIQUE constraint failed')) {
        return NextResponse.json(
          { error: `Section "${section_name}" already exists` },
          { status: 409 }
        )
      }
      throw dbError
    }
  } catch (error) {
    console.error('Failed to create section:', error)
    return NextResponse.json(
      { error: 'Failed to create section' },
      { status: 500 }
    )
  }
}