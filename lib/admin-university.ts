import { getDb } from "@/lib/db"

export function getAdminUniversityId(adminSessionId: string): string {
  const row = getDb()
    .prepare("SELECT university_id FROM admins WHERE id = ?")
    .get(adminSessionId) as { university_id: string } | undefined
  return row?.university_id ?? "edutrack_main"
}

export function isTeacherInUniversity(teacherId: string, universityId: string): boolean {
  const r = getDb()
    .prepare("SELECT 1 AS ok FROM teachers WHERE id = ? AND university_id = ?")
    .get(teacherId, universityId) as { ok: number } | undefined
  return Boolean(r)
}

export function isCourseInUniversity(courseId: string, universityId: string): boolean {
  const r = getDb()
    .prepare("SELECT 1 AS ok FROM courses WHERE id = ? AND university_id = ?")
    .get(courseId, universityId) as { ok: number } | undefined
  return Boolean(r)
}
