import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionUser } from '@/lib/api-auth'
import { readFileSync } from 'fs'
import path from 'path'

type Params = { params: Promise<{ courseId: string; materialId: string }> }

export async function GET(
  request: NextRequest,
  context: Params
) {
  try {
    const session = await getSessionUser()
    if (!session || session.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId, materialId } = await context.params
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

    // Get material info
    const material = db.prepare(`
      SELECT id, course_id, title, file_path, file_name, file_size, mime_type, url
      FROM course_materials
      WHERE id = ? AND course_id = ?
    `).get(materialId, courseId)

    if (!material) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      )
    }

    // If it's a URL-based material, redirect to the URL
    if (material.url && !material.file_path) {
      return NextResponse.redirect(material.url)
    }

    // If it's a file-based material, serve the file
    if (material.file_path) {
      const filePath = path.join(process.cwd(), 'public', material.file_path)
      
      try {
        const fileBuffer = readFileSync(filePath)
        const response = new NextResponse(fileBuffer)
        response.headers.set('Content-Type', material.mime_type || 'application/octet-stream')
        response.headers.set(
          'Content-Disposition',
          `attachment; filename="${material.file_name || 'download'}"`
        )
        response.headers.set('Content-Length', String(fileBuffer.length))
        return response
      } catch (error) {
        console.error('Failed to read file:', error)
        return NextResponse.json(
          { error: 'File not found on server' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Material has no content' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to download material:', error)
    return NextResponse.json(
      { error: 'Failed to download material' },
      { status: 500 }
    )
  }
}
