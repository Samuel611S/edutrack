"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { AdminPageShell } from "@/components/admin-page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Pencil, Search, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

type Teacher = {
  id: string
  email: string
  full_name: string
  employee_id: string
  department: string | null
}

const PAGE_SIZE = 25

export default function AdminTeachersPage() {
  const [rows, setRows] = useState<Teacher[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [q, setQ] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Teacher | null>(null)
  const [editDraft, setEditDraft] = useState({
    email: "",
    full_name: "",
    employee_id: "",
    department: "",
    password: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (q) params.set("q", q)
    const res = await fetch(`/api/admin/teachers?${params}`, { credentials: "include" })
    const j = await res.json()
    if (res.ok) {
      setRows(j.teachers || [])
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
    const res = await fetch("/api/admin/teachers", {
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
    setMsg("Teacher created.")
    e.currentTarget.reset()
    await load()
  }

  const startEdit = (r: Teacher) => {
    setEditing(r)
    setEditDraft({
      email: r.email,
      full_name: r.full_name,
      employee_id: r.employee_id,
      department: r.department ?? "",
      password: "",
    })
  }

  const saveEdit = async () => {
    if (!editing) return
    setMsg("")
    const res = await fetch(`/api/admin/teachers/${encodeURIComponent(editing.id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: editDraft.email,
        full_name: editDraft.full_name,
        employee_id: editDraft.employee_id,
        department: editDraft.department || null,
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

  const remove = async (r: Teacher) => {
    if (!window.confirm(`Delete teacher ${r.full_name} (${r.id})? Courses assigned to them will be removed too.`)) return
    setMsg("")
    const res = await fetch(`/api/admin/teachers/${encodeURIComponent(r.id)}`, {
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

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminPageShell title="Teachers" subtitle="Search, browse, create, edit, and remove faculty accounts">
        {msg && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">{msg}</p>
        )}

        <Card className="bg-white/95 border-white/80 shadow-md mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Browse</CardTitle>
            <CardDescription>Filter by ID, name, email, employee ID, or department</CardDescription>
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
                  placeholder="Search…"
                  className="bg-white"
                />
                <Button type="button" onClick={applySearch} className="bg-indigo-600 shrink-0">
                  <Search className="w-4 h-4 mr-1" />
                  Search
                </Button>
              </div>
            </div>
            <p className="text-sm text-slate-600">{loading ? "Loading…" : `${total} total · Page ${page} of ${totalPages}`}</p>
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
                      <th className="py-3 px-3 font-semibold">Employee</th>
                      <th className="py-3 px-3 font-semibold">Dept</th>
                      <th className="py-3 px-3 w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-indigo-50/30">
                        <td className="py-2.5 px-3 font-mono text-xs">{r.id}</td>
                        <td className="py-2.5 px-3 font-medium">{r.full_name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{r.email}</td>
                        <td className="py-2.5 px-3 font-mono text-xs">{r.employee_id}</td>
                        <td className="py-2.5 px-3">{r.department ?? "—"}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex gap-1">
                            <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={() => startEdit(r)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-red-600 border-red-200"
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
              <CardTitle className="text-lg">Edit teacher — {editing.id}</CardTitle>
              <CardDescription>Leave password blank to keep unchanged</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Full name</Label>
                <Input value={editDraft.full_name} onChange={(e) => setEditDraft((d) => ({ ...d, full_name: e.target.value }))} className="mt-1 bg-white" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={editDraft.email} onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))} className="mt-1 bg-white" />
              </div>
              <div>
                <Label>Employee ID</Label>
                <Input value={editDraft.employee_id} onChange={(e) => setEditDraft((d) => ({ ...d, employee_id: e.target.value }))} className="mt-1 bg-white" />
              </div>
              <div className="md:col-span-2">
                <Label>Department</Label>
                <Input value={editDraft.department} onChange={(e) => setEditDraft((d) => ({ ...d, department: e.target.value }))} className="mt-1 bg-white" />
              </div>
              <div className="md:col-span-2">
                <Label>New password (optional)</Label>
                <Input type="password" value={editDraft.password} onChange={(e) => setEditDraft((d) => ({ ...d, password: e.target.value }))} className="mt-1 bg-white" />
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
            <CardTitle className="text-lg">Add teacher</CardTitle>
            <CardDescription>Login ID must start with 12</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="id">Login ID (12…)</Label>
                <Input id="id" name="id" required placeholder="12511999" className="mt-1 bg-white" />
              </div>
              <div>
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input id="employee_id" name="employee_id" required placeholder="EMP0999" className="mt-1 bg-white" />
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
              <div className="md:col-span-2">
                <Label htmlFor="department">Department (optional)</Label>
                <Input id="department" name="department" className="mt-1 bg-white" />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Create teacher
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </AdminPageShell>
    </ProtectedRoute>
  )
}
