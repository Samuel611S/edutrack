import { randomUUID } from "node:crypto"
import type Database from "better-sqlite3"

export type CourseMaterialType = "video" | "pdf"

export type CourseMaterialRow = {
  id: string
  course_id: string
  title: string
  description: string | null
  material_type: string
  url: string
  sort_order: number
  created_at: string
}

export function parseMaterialType(raw: unknown): CourseMaterialType | null {
  const t = typeof raw === "string" ? raw.toLowerCase().trim() : ""
  if (t === "video" || t === "pdf") return t
  return null
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
      `SELECT id, course_id, title, description, material_type, url, sort_order, created_at
       FROM course_materials WHERE course_id = ? ORDER BY sort_order ASC, created_at ASC`,
    )
    .all(courseId) as CourseMaterialRow[]
}

export function insertCourseMaterial(
  db: Database.Database,
  courseId: string,
  input: { title: string; description: string | null; materialType: CourseMaterialType; url: string },
): string {
  const id = `cm_${randomUUID().slice(0, 12)}`
  const row = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM course_materials WHERE course_id = ?")
    .get(courseId) as { n: number }
  db.prepare(
    `INSERT INTO course_materials (id, course_id, title, description, material_type, url, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, courseId, input.title.trim(), input.description, input.materialType, input.url.trim(), row.n)
  return id
}

export function updateCourseMaterial(
  db: Database.Database,
  courseId: string,
  materialId: string,
  patch: Partial<{ title: string; description: string | null; materialType: CourseMaterialType; url: string }>,
): boolean {
  const updates: string[] = []
  const values: (string | null)[] = []
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
    values.push(patch.url.trim())
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
