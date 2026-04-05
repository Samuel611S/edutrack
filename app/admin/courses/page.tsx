"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<
    { id: string; course_code: string; course_name: string; semester: string; teacher_id: string; teacher_name: string }[]
  >([])
  const [teachers, setTeachers] = useState<{ id: string; full_name: string }[]>([])
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [cRes, tRes] = await Promise.all([
      fetch("/api/admin/courses", { credentials: "include" }),
      fetch("/api/admin/teachers", { credentials: "include" }),
    ])
    const cj = await cRes.json()
    const tj = await tRes.json()
    if (cRes.ok) setCourses(cj.courses || [])
    if (tRes.ok) setTeachers((tj.teachers || []).map((t: { id: string; full_name: string }) => ({ id: t.id, full_name: t.full_name })))
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

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

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Courses</h1>
            <Button variant="outline" asChild>
              <Link href="/admin/dashboard">Back to dashboard</Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All courses</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : (
                <div className="overflow-x-auto text-sm">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4">Code</th>
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Semester</th>
                        <th className="py-2 pr-4">Teacher</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((c) => (
                        <tr key={c.id} className="border-b border-gray-100">
                          <td className="py-2 pr-4 font-mono">{c.course_code}</td>
                          <td className="py-2 pr-4">{c.course_name}</td>
                          <td className="py-2 pr-4">{c.semester}</td>
                          <td className="py-2 pr-4">{c.teacher_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add course</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="course_code">Course code</Label>
                  <Input id="course_code" name="course_code" required placeholder="CS401" />
                </div>
                <div>
                  <Label htmlFor="semester">Semester</Label>
                  <Input id="semester" name="semester" required placeholder="2026-Fall" />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="course_name">Course name</Label>
                  <Input id="course_name" name="course_name" required />
                </div>
                <div>
                  <Label htmlFor="teacher_id">Teacher</Label>
                  <select
                    id="teacher_id"
                    name="teacher_id"
                    className="w-full border rounded-md h-10 px-2 bg-white"
                    required
                  >
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
                  <Input id="credits" name="credits" type="number" defaultValue={3} />
                </div>
                <div>
                  <Label htmlFor="max_capacity">Max capacity</Label>
                  <Input id="max_capacity" name="max_capacity" type="number" placeholder="30" />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit">Create</Button>
                  {msg && <p className="text-sm mt-2 text-gray-600">{msg}</p>}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </ProtectedRoute>
  )
}
