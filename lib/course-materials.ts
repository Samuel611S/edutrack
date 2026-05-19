import { randomUUID } from "node:crypto"
import type Database from "better-sqlite3"

export type CourseMaterialType = "video" | "pdf" | "word" | "docx"

export type CourseMaterialRow = {
  id: string
  course_id: string
  title: string
  description: string | null
  material_type: string
  url: string | null
  file_path: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  sort_order: number
  created_at: string
}

export function parseMaterialType(raw: unknown): CourseMaterialType | null {
  const t = typeof raw === "string" ? raw.toLowerCase().trim() : ""
  if (t === "video" || t === "pdf" || t === "word" || t === "docx") return t as CourseMaterialType
  return null
}

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".mkv", ".avi"]

export function inferMaterialTypeFromFile(fileName: string): CourseMaterialType | null {
  const name = fileName.trim().toLowerCase()
  if (name.endsWith(".pdf")) return "pdf"
  if (name.endsWith(".docx")) return "docx"
  if (name.endsWith(".doc")) return "word"
  if (VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext))) return "video"
  return null
}

export function inferMaterialTypeFromUrl(raw: string): CourseMaterialType | null {
  const u = raw.trim().toLowerCase()
  if (!u) return null
  if (u.endsWith(".pdf")) return "pdf"
  if (u.endsWith(".docx")) return "docx"
  if (u.endsWith(".doc")) return "word"
  if (u.includes("youtube.com") || u.includes("youtu.be") || u.includes("vimeo.com")) return "video"
  return "video"
}

export function sanitizeMaterialUrl(raw: string): string | null {
  const u = raw.trim()
  if (!u) return null
  const lower = u.toLowerCase()
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return null
  return u
}

export function listCourseMaterials(db: Database.Database, courseId: string): CourseMaterialRow[] {
  return db
    .prepare(
      `SELECT id, course_id, title, description, material_type, url, file_path, file_name, file_size, mime_type, sort_order, created_at
       FROM course_materials WHERE course_id = ? ORDER BY sort_order ASC, created_at ASC`,
    )
    .all(courseId) as CourseMaterialRow[]
}

export function insertCourseMaterial(
  db: Database.Database,
  courseId: string,
  input: { 
    title: string
    description: string | null
    materialType: CourseMaterialType
    url?: string | null
    filePath?: string | null
    fileName?: string | null
    fileSize?: number | null
    mimeType?: string | null
  },
): string {
  const id = `cm_${randomUUID().slice(0, 12)}`
  const row = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM course_materials WHERE course_id = ?")
    .get(courseId) as { n: number }
  db.prepare(
    `INSERT INTO course_materials (id, course_id, title, description, material_type, url, file_path, file_name, file_size, mime_type, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    courseId,
    input.title.trim(),
    input.description,
    input.materialType,
    input.url?.trim() || null,
    input.filePath || null,
    input.fileName || null,
    input.fileSize || null,
    input.mimeType || null,
    row.n
  )
  return id
}

export function updateCourseMaterial(
  db: Database.Database,
  courseId: string,
  materialId: string,
  patch: Partial<{ 
    title: string
    description: string | null
    materialType: CourseMaterialType
    url: string | null
    filePath: string | null
    fileName: string | null
    fileSize: number | null
    mimeType: string | null
  }>,
): boolean {
  const updates: string[] = []
  const values: (string | number | null)[] = []
  if (patch.title !== undefined) {
    updates.push("title = ?")
    values.push(patch.title.trim())
  }
  if (patch.description !== undefined) {
    updates.push("description = ?")
    values.push(patch.description)
  }
  if (patch.materialType !== undefined) {
    updates.push("material_type = ?")
    values.push(patch.materialType)
  }
  if (patch.url !== undefined) {
    updates.push("url = ?")
    values.push(patch.url?.trim() || null)
  }
  if (patch.filePath !== undefined) {
    updates.push("file_path = ?")
    values.push(patch.filePath)
  }
  if (patch.fileName !== undefined) {
    updates.push("file_name = ?")
    values.push(patch.fileName)
  }
  if (patch.fileSize !== undefined) {
    updates.push("file_size = ?")
    values.push(patch.fileSize)
  }
  if (patch.mimeType !== undefined) {
    updates.push("mime_type = ?")
    values.push(patch.mimeType)
  }
  if (updates.length === 0) return false
  values.push(materialId, courseId)
  const r = db
    .prepare(`UPDATE course_materials SET ${updates.join(", ")} WHERE id = ? AND course_id = ?`)
    .run(...values)
  return r.changes > 0
}

export function deleteCourseMaterial(db: Database.Database, courseId: string, materialId: string): boolean {
  const r = db.prepare("DELETE FROM course_materials WHERE id = ? AND course_id = ?").run(materialId, courseId)
  return r.changes > 0
}
