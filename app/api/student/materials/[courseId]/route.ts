import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionUser } from '@/lib/api-auth'

type Params = { params: Promise<{ courseId: string }> }

export async function GET(
  request: NextRequest,
  context: Params
) {
  try {
    const session = await getSessionUser()
    if (!session || session.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId } = await context.params
    const db = getDb()

    // Verify student is enrolled in the course
    const enrollment = db.prepare(`
      SELECT ce.id FROM course_enrollments ce
      WHERE ce.course_id = ? AND ce.student_id = ?
    `).get(courseId, session.sub)

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      )
    }

    // Get course materials
    const materials = db.prepare(`
      SELECT 
        id, 
        course_id, 
        title, 
        description, 
        material_type, 
        url,
        file_path,
        file_name,
        file_size,
        mime_type,
        sort_order, 
        created_at
      FROM course_materials
      WHERE course_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `).all(courseId)

    return NextResponse.json({ materials })
  } catch (error) {
    console.error('Failed to fetch materials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    )
  }
}
