"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { AdminPageShell } from "@/components/admin-page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Pencil, Search, Trash2, Video } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

type Course = {
  id: string
  course_code: string
  course_name: string
  description: string | null
  semester: string
  credits: number
  max_capacity: number | null
  teacher_id: string
  teacher_name: string
}

type TeacherOpt = { id: string; full_name: string }

type AdminCourseMaterial = {
  id: string
  title: string
  description: string | null
  material_type: string
  url: string
}

const PAGE_SIZE = 25

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [q, setQ] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(true)
  const [teachers, setTeachers] = useState<TeacherOpt[]>([])
  const [editing, setEditing] = useState<Course | null>(null)
  const [editDraft, setEditDraft] = useState({
    course_code: "",
    course_name: "",
    description: "",
    semester: "",
    credits: "",
    max_capacity: "",
    teacher_id: "",
  })
  const [adminMaterials, setAdminMaterials] = useState<AdminCourseMaterial[]>([])
  const [adminMatLoading, setAdminMatLoading] = useState(false)
  const [adminMatSaving, setAdminMatSaving] = useState(false)
  const [adminMatForm, setAdminMatForm] = useState({
    title: "",
    description: "",
    materialType: "video" as "video" | "pdf",
    url: "",
  })

  const loadTeachers = useCallback(async () => {
    const res = await fetch("/api/admin/teachers?page=1&pageSize=200", { credentials: "include" })
    const j = await res.json()
    if (res.ok) setTeachers((j.teachers || []).map((t: { id: string; full_name: string }) => ({ id: t.id, full_name: t.full_name })))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (q) params.set("q", q)
    const res = await fetch(`/api/admin/courses?${params}`, { credentials: "include" })
    const j = await res.json()
    if (res.ok) {
      setCourses(j.courses || [])
      setTotal(j.total ?? 0)
      setTotalPages(j.totalPages ?? 1)
    }
    setLoading(false)
  }, [page, q])

  useEffect(() => {
    void loadTeachers()
  }, [loadTeachers])

  useEffect(() => {
    void load()
  }, [load])

  const loadAdminMaterials = useCallback(async (courseId: string) => {
    setAdminMatLoading(true)
    try {
      const res = await fetch(`/api/admin/courses/${encodeURIComponent(courseId)}/materials`, {
        credentials: "include",
      })
      const j = await res.json()
      if (res.ok) setAdminMaterials(j.materials || [])
    } finally {
      setAdminMatLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!editing) {
      setAdminMaterials([])
      setAdminMatForm({ title: "", description: "", materialType: "video", url: "" })
      return
    }
    void loadAdminMaterials(editing.id)
  }, [editing, loadAdminMaterials])

  const applySearch = () => {
    setQ(searchInput.trim())
    setPage(1)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsg("")
    const fd = new FormData(e.currentTarget)
    const body = Object.fromEntries(fd.entries()) as Record<string, string>
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const j = await res.json()
    if (!res.ok) {
      setMsg(j.message || "Error")
      return
    }
    setMsg("Course created.")
    e.currentTarget.reset()
    await load()
  }

  const startEdit = (c: Course) => {
    setEditing(c)
    setEditDraft({
      course_code: c.course_code,
      course_name: c.course_name,
      description: c.description ?? "",
      semester: c.semester,
      credits: String(c.credits),
      max_capacity: c.max_capacity != null ? String(c.max_capacity) : "",
      teacher_id: c.teacher_id,
    })
  }

  const saveEdit = async () => {
    if (!editing) return
    setMsg("")
    const res = await fetch(`/api/admin/courses/${encodeURIComponent(editing.id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course_code: editDraft.course_code,
        course_name: editDraft.course_name,
        description: editDraft.description,
        semester: editDraft.semester,
        credits: Number(editDraft.credits) || 3,
        max_capacity: editDraft.max_capacity === "" ? null : Number(editDraft.max_capacity),
        teacher_id: editDraft.teacher_id,
      }),
    })
    const j = await res.json()
    if (!res.ok) {
      setMsg(j.message || "Update failed")
      return
    }
    setEditing(null)
    setMsg("Saved.")
    await load()
  }

  const addAdminMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setAdminMatSaving(true)
    setMsg("")
    try {
      const res = await fetch(`/api/admin/courses/${encodeURIComponent(editing.id)}/materials`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: adminMatForm.title,
          description: adminMatForm.description || undefined,
          materialType: adminMatForm.materialType,
          url: adminMatForm.url,
        }),
      })
      const j = await res.json()
      if (!res.ok) {
        setMsg(j.message || "Could not add material")
        return
      }
      setAdminMatForm({ title: "", description: "", materialType: adminMatForm.materialType, url: "" })
      await loadAdminMaterials(editing.id)
      setMsg("Material added.")
    } finally {
      setAdminMatSaving(false)
    }
  }

  const removeAdminMaterial = async (materialId: string) => {
    if (!editing || !window.confirm("Remove this material?")) return
    setMsg("")
    const res = await fetch(
      `/api/admin/courses/${encodeURIComponent(editing.id)}/materials/${encodeURIComponent(materialId)}`,
      { method: "DELETE", credentials: "include" },
    )
    const j = await res.json()
    if (!res.ok) {
      setMsg(j.message || "Remove failed")
      return
    }
    setAdminMaterials((prev) => prev.filter((m) => m.id !== materialId))
    setMsg("Material removed.")
  }

  const remove = async (c: Course) => {
    if (!window.confirm(`Delete ${c.course_code} — ${c.course_name}? Lectures and enrollments go too.`)) return
    setMsg("")
    const res = await fetch(`/api/admin/courses/${encodeURIComponent(c.id)}`, { method: "DELETE", credentials: "include" })
    if (!res.ok) {
      const j = await res.json()
      setMsg(j.message || "Delete failed")
      return
    }
    await load()
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminPageShell title="Courses" subtitle="Search, assign instructors, edit catalog entries, or remove courses">
        {msg && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">{msg}</p>
        )}

        <Card className="bg-white/95 border-white/80 shadow-md mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Browse</CardTitle>
            <CardDescription>Search code, title, semester, teacher, or description</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>Search</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applySearch())}
                  placeholder="Search catalog…"
                  className="bg-white"
                />
                <Button type="button" onClick={applySearch} className="bg-indigo-600 shrink-0">
                  <Search className="w-4 h-4 mr-1" />
                  Search
                </Button>
              </div>
            </div>
            <p className="text-sm text-slate-600">{loading ? "Loading…" : `${total} courses · Page ${page} of ${totalPages}`}</p>
          </CardContent>
        </Card>

        <Card className="bg-white/95 border-white/80 shadow-md mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Catalog</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0 sm:p-6 pt-0">
            {loading ? (
              <p className="text-sm text-gray-500 p-6">Loading…</p>
            ) : (
              <>
                <table className="w-full text-sm border-collapse min-w-[720px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-slate-600">
                      <th className="py-3 px-2 font-semibold">Code</th>
                      <th className="py-3 px-2 font-semibold">Name</th>
                      <th className="py-3 px-2 font-semibold">Semester</th>
                      <th className="py-3 px-2 font-semibold">Teacher</th>
                      <th className="py-3 px-2 font-semibold w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-violet-50/30">
                        <td className="py-2.5 px-2 font-mono text-xs font-semibold text-indigo-700">{c.course_code}</td>
                        <td className="py-2.5 px-2 max-w-[220px]">
                          <span className="font-medium text-gray-900">{c.course_name}</span>
                          {c.description && <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{c.description}</p>}
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap">{c.semester}</td>
                        <td className="py-2.5 px-2 text-sm">{c.teacher_name}</td>
                        <td className="py-2.5 px-2">
                          <div className="flex gap-1">
                            <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={() => startEdit(c)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-red-600 border-red-200"
                              onClick={() => remove(c)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between gap-4 p-4 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-slate-600">
                    Page {page} / {totalPages}
                  </span>
                  <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {editing && (
          <Card className="bg-amber-50/80 border-amber-200 shadow-md mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Edit course — {editing.id}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Course code</Label>
                <Input value={editDraft.course_code} onChange={(e) => setEditDraft((d) => ({ ...d, course_code: e.target.value }))} className="mt-1 bg-white" />
              </div>
              <div>
                <Label>Semester</Label>
                <Input value={editDraft.semester} onChange={(e) => setEditDraft((d) => ({ ...d, semester: e.target.value }))} className="mt-1 bg-white" />
              </div>
              <div className="md:col-span-2">
                <Label>Course name</Label>
                <Input value={editDraft.course_name} onChange={(e) => setEditDraft((d) => ({ ...d, course_name: e.target.value }))} className="mt-1 bg-white" />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm mt-1"
                  value={editDraft.description}
                  onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
                />
              </div>
              <div>
                <Label>Instructor</Label>
                <select
                  className="w-full border rounded-md h-10 px-2 bg-white mt-1"
                  value={editDraft.teacher_id}
                  onChange={(e) => setEditDraft((d) => ({ ...d, teacher_id: e.target.value }))}
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} — {t.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Credits</Label>
                <Input value={editDraft.credits} onChange={(e) => setEditDraft((d) => ({ ...d, credits: e.target.value }))} type="number" className="mt-1 bg-white" />
              </div>
              <div>
                <Label>Max capacity</Label>
                <Input value={editDraft.max_capacity} onChange={(e) => setEditDraft((d) => ({ ...d, max_capacity: e.target.value }))} type="number" className="mt-1 bg-white" placeholder="Optional" />
              </div>

              <div className="md:col-span-2 border-t border-amber-200 pt-6 mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <Video className="w-5 h-5 text-violet-600" />
                  <h3 className="text-base font-semibold text-gray-900">Student course materials</h3>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  Videos (e.g. YouTube) and PDF links appear on the student dashboard for everyone enrolled in this
                  course.
                </p>

                <form onSubmit={addAdminMaterial} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  <div className="md:col-span-2">
                    <Label>Title</Label>
                    <Input
                      value={adminMatForm.title}
                      onChange={(e) => setAdminMatForm((f) => ({ ...f, title: e.target.value }))}
                      className="mt-1 bg-white"
                      required
                      placeholder="e.g. Syllabus PDF"
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <select
                      className="w-full border rounded-md h-10 px-2 bg-white mt-1"
                      value={adminMatForm.materialType}
                      onChange={(e) =>
                        setAdminMatForm((f) => ({ ...f, materialType: e.target.value as "video" | "pdf" }))
                      }
                    >
                      <option value="video">Video</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>
                  <div>
                    <Label>URL</Label>
                    <Input
                      value={adminMatForm.url}
                      onChange={(e) => setAdminMatForm((f) => ({ ...f, url: e.target.value }))}
                      className="mt-1 bg-white"
                      required
                      placeholder="https://… or /materials/file.pdf"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description (optional)</Label>
                    <textarea
                      className="w-full min-h-[64px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm mt-1"
                      value={adminMatForm.description}
                      onChange={(e) => setAdminMatForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button type="submit" className="bg-violet-600 hover:bg-violet-700" disabled={adminMatSaving}>
                      {adminMatSaving ? "Adding…" : "Add material"}
                    </Button>
                  </div>
                </form>

                {adminMatLoading ? (
                  <p className="text-sm text-slate-500">Loading materials…</p>
                ) : adminMaterials.length === 0 ? (
                  <p className="text-sm text-slate-500">No materials for this course yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {adminMaterials.map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-slate-200 bg-white"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-900">{m.title}</p>
                          <p className="text-xs text-slate-500 uppercase">{m.material_type}</p>
                          <p className="text-xs font-mono text-slate-600 truncate mt-1">{m.url}</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 shrink-0"
                          onClick={() => removeAdminMaterial(m.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button type="button" className="bg-indigo-600" onClick={saveEdit}>
                  Save changes
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/95 border-white/80 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Add course</CardTitle>
            <CardDescription>Assign an instructor from your roster</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="course_code">Course code</Label>
                <Input id="course_code" name="course_code" required placeholder="CS401" className="mt-1 bg-white" />
              </div>
              <div>
                <Label htmlFor="semester">Semester</Label>
                <Input id="semester" name="semester" required placeholder="2026-Fall" className="mt-1 bg-white" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="course_name">Course name</Label>
                <Input id="course_name" name="course_name" required className="mt-1 bg-white" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description (optional)</Label>
                <textarea id="description" name="description" className="w-full min-h-[72px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm mt-1" placeholder="Short catalog text" />
              </div>
              <div>
                <Label htmlFor="teacher_id">Teacher</Label>
                <select id="teacher_id" name="teacher_id" className="w-full border rounded-md h-10 px-2 bg-white mt-1" required>
                  <option value="">Select…</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} — {t.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="credits">Credits</Label>
                <Input id="credits" name="credits" type="number" defaultValue={3} className="mt-1 bg-white" />
              </div>
              <div>
                <Label htmlFor="max_capacity">Max capacity</Label>
                <Input id="max_capacity" name="max_capacity" type="number" placeholder="40" className="mt-1 bg-white" />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Create course
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </AdminPageShell>
    </ProtectedRoute>
  )
}
