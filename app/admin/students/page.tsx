"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { AdminPageShell } from "@/components/admin-page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Pencil, Search, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

type Student = {
  id: string
  email: string
  full_name: string
  student_id: string
  major: string | null
  gpa: number | null
}

type EnrollmentState = {
  student: { id: string; full_name: string }
  enrolled: { enrollment_id: string; course_id: string; course_code: string; course_name: string; semester: string }[]
  courses: { id: string; course_code: string; course_name: string; semester: string }[]
  requests: {
    id: string
    request_type: "add" | "drop"
    status: "pending" | "approved" | "rejected"
    is_overload: number
    reason: string | null
    created_at: string
    course_code: string
    course_name: string
    semester: string
    reviewed_by_name: string | null
  }[]
  payment: {
    semester: string
    total_credits: number
    amount: number
    amount_per_credit: number
    payment_status: "paid" | "unpaid"
  } | null
}

const PAGE_SIZE = 25

export default function AdminStudentsPage() {
  const [rows, setRows] = useState<Student[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [q, setQ] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Student | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentState | null>(null)
  const [editDraft, setEditDraft] = useState({
    email: "",
    full_name: "",
    student_id: "",
    major: "",
    gpa: "",
    password: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (q) params.set("q", q)
    const res = await fetch(`/api/admin/students?${params}`, { credentials: "include" })
    const j = await res.json()
    if (res.ok) {
      setRows(j.students || [])
      setTotal(j.total ?? 0)
      setTotalPages(j.totalPages ?? 1)
    }
    setLoading(false)
  }, [page, q])

  useEffect(() => {
    void load()
  }, [load])

  const applySearch = () => {
    setQ(searchInput.trim())
    setPage(1)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsg("")
    const fd = new FormData(e.currentTarget)
    const body = Object.fromEntries(fd.entries()) as Record<string, string>
    const res = await fetch("/api/admin/students", {
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
    setMsg("Student created.")
    e.currentTarget.reset()
    await load()
  }

  const startEdit = (r: Student) => {
    setEditing(r)
    setEditDraft({
      email: r.email,
      full_name: r.full_name,
      student_id: r.student_id,
      major: r.major ?? "",
      gpa: r.gpa != null ? String(r.gpa) : "",
      password: "",
    })
  }

  const saveEdit = async () => {
    if (!editing) return
    setMsg("")
    const res = await fetch(`/api/admin/students/${encodeURIComponent(editing.id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: editDraft.email,
        full_name: editDraft.full_name,
        student_id: editDraft.student_id,
        major: editDraft.major || null,
        gpa: editDraft.gpa === "" ? null : Number(editDraft.gpa),
        password: editDraft.password || undefined,
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

  const remove = async (r: Student) => {
    if (!window.confirm(`Delete student ${r.full_name} (${r.id})? This cannot be undone.`)) return
    setMsg("")
    const res = await fetch(`/api/admin/students/${encodeURIComponent(r.id)}`, {
      method: "DELETE",
      credentials: "include",
    })
    if (!res.ok) {
      const j = await res.json()
      setMsg(j.message || "Delete failed")
      return
    }
    await load()
  }

  const openEnrollments = async (studentId: string) => {
    const res = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}/enrollments`, { credentials: "include" })
    const j = await res.json()
    if (!res.ok) {
      setMsg(j.message || "Failed to load enrollments")
      return
    }
    setEnrollments(j)
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminPageShell title="Students" subtitle="Search, browse, create, edit, and remove student accounts">
        {msg && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">{msg}</p>
        )}

        <Card className="bg-white/95 border-white/80 shadow-md mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Browse</CardTitle>
            <CardDescription>Filter by ID, name, email, student number, or major</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Search</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applySearch())}
                  placeholder="Type and press Search…"
                  className="bg-white"
                />
                <Button type="button" onClick={applySearch} className="bg-indigo-600 shrink-0">
                  <Search className="w-4 h-4 mr-1" />
                  Search
                </Button>
              </div>
            </div>
            <p className="text-sm text-slate-600 w-full sm:w-auto">
              {loading ? "Loading…" : `${total} total · Page ${page} of ${totalPages}`}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/95 border-white/80 shadow-md mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Directory</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0 sm:p-6 pt-0">
            {loading ? (
              <p className="text-sm text-gray-500 p-6">Loading…</p>
            ) : (
              <>
                <table className="w-full text-sm border-collapse min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-slate-600">
                      <th className="py-3 px-3 font-semibold">ID</th>
                      <th className="py-3 px-3 font-semibold">Name</th>
                      <th className="py-3 px-3 font-semibold">Email</th>
                      <th className="py-3 px-3 font-semibold">Student #</th>
                      <th className="py-3 px-3 font-semibold">GPA</th>
                      <th className="py-3 px-3 font-semibold w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-indigo-50/30">
                        <td className="py-2.5 px-3 font-mono text-xs">{r.id}</td>
                        <td className="py-2.5 px-3 font-medium text-gray-900">{r.full_name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{r.email}</td>
                        <td className="py-2.5 px-3 font-mono text-xs">{r.student_id}</td>
                        <td className="py-2.5 px-3">{r.gpa ?? "—"}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex gap-1">
                            <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={() => startEdit(r)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={() => void openEnrollments(r.id)}>
                              Courses
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => remove(r)}
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-slate-600">
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
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
              <CardTitle className="text-lg">Edit student — {editing.id}</CardTitle>
              <CardDescription>Leave password blank to keep the current one</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Full name</Label>
                <Input
                  value={editDraft.full_name}
                  onChange={(e) => setEditDraft((d) => ({ ...d, full_name: e.target.value }))}
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editDraft.email}
                  onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))}
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <Label>Student #</Label>
                <Input
                  value={editDraft.student_id}
                  onChange={(e) => setEditDraft((d) => ({ ...d, student_id: e.target.value }))}
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <Label>Major</Label>
                <Input
                  value={editDraft.major}
                  onChange={(e) => setEditDraft((d) => ({ ...d, major: e.target.value }))}
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <Label>GPA</Label>
                <Input
                  value={editDraft.gpa}
                  onChange={(e) => setEditDraft((d) => ({ ...d, gpa: e.target.value }))}
                  className="mt-1 bg-white"
                />
              </div>
              <div className="md:col-span-2">
                <Label>New password (optional)</Label>
                <Input
                  type="password"
                  value={editDraft.password}
                  onChange={(e) => setEditDraft((d) => ({ ...d, password: e.target.value }))}
                  className="mt-1 bg-white"
                  placeholder="••••••••"
                />
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

        {enrollments && (
          <Card className="bg-blue-50/70 border-blue-200 shadow-md mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Course process view — {enrollments.student.full_name}</CardTitle>
              <CardDescription>Admin can monitor all registration requests, approvals, and payment status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Button type="button" variant="outline" onClick={() => setEnrollments(null)}>
                  Close
                </Button>
              </div>
              {enrollments.payment && (
                <div className="rounded border bg-white px-3 py-2 text-sm">
                  Payment: {enrollments.payment.semester} | {enrollments.payment.total_credits} credits |{" "}
                  {enrollments.payment.amount_per_credit.toLocaleString()} per credit | Total{" "}
                  {enrollments.payment.amount.toLocaleString()} | Status{" "}
                  <strong>{enrollments.payment.payment_status.toUpperCase()}</strong>
                </div>
              )}
              <div className="space-y-2">
                {enrollments.enrolled.map((e) => (
                  <div key={e.enrollment_id} className="border rounded bg-white px-3 py-2">
                    <p className="text-sm">
                      {e.course_code} - {e.course_name} ({e.semester})
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Request history</p>
                {enrollments.requests.length === 0 && <p className="text-sm text-slate-500">No requests yet.</p>}
                {enrollments.requests.map((r) => (
                  <div key={r.id} className="rounded border bg-white px-3 py-2 text-sm">
                    {r.course_code} - {r.course_name} ({r.semester}) | {r.request_type.toUpperCase()} |{" "}
                    <strong>{r.status.toUpperCase()}</strong>
                    {r.reviewed_by_name ? ` | Teacher: ${r.reviewed_by_name}` : ""}
                    {r.is_overload === 1 ? " | Overload request" : ""}
                    {r.reason ? ` | Reason: ${r.reason}` : ""}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/95 border-white/80 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Add student</CardTitle>
            <CardDescription>Login ID must start with 22 (student role prefix)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="id">Login ID (22…)</Label>
                <Input id="id" name="id" required placeholder="22511999" className="mt-1 bg-white" />
              </div>
              <div>
                <Label htmlFor="student_id">University student #</Label>
                <Input id="student_id" name="student_id" required placeholder="STU0999" className="mt-1 bg-white" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" name="full_name" required className="mt-1 bg-white" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required className="mt-1 bg-white" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required className="mt-1 bg-white" />
              </div>
              <div>
                <Label htmlFor="major">Major (optional)</Label>
                <Input id="major" name="major" className="mt-1 bg-white" />
              </div>
              <div>
                <Label htmlFor="gpa">GPA (optional)</Label>
                <Input id="gpa" name="gpa" type="number" step="0.01" className="mt-1 bg-white" />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Create student
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </AdminPageShell>
    </ProtectedRoute>
  )
}
