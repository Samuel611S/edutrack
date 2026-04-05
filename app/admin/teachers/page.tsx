"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function AdminTeachersPage() {
  const [rows, setRows] = useState<
    { id: string; email: string; full_name: string; employee_id: string; department: string | null }[]
  >([])
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const res = await fetch("/api/admin/teachers", { credentials: "include" })
    const j = await res.json()
    if (res.ok) setRows(j.teachers || [])
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

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Teachers</h1>
            <Button variant="outline" asChild>
              <Link href="/admin/dashboard">Back to dashboard</Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All teachers</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : (
                <div className="overflow-x-auto text-sm">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4">ID</th>
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Employee</th>
                        <th className="py-2 pr-4">Dept</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b border-gray-100">
                          <td className="py-2 pr-4 font-mono">{r.id}</td>
                          <td className="py-2 pr-4">{r.full_name}</td>
                          <td className="py-2 pr-4">{r.email}</td>
                          <td className="py-2 pr-4">{r.employee_id}</td>
                          <td className="py-2 pr-4">{r.department ?? "—"}</td>
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
              <CardTitle>Add teacher</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="id">Login ID (12…)</Label>
                  <Input id="id" name="id" required placeholder="12511999" />
                </div>
                <div>
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input id="employee_id" name="employee_id" required placeholder="EMP099" />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input id="full_name" name="full_name" required />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="department">Department (optional)</Label>
                  <Input id="department" name="department" />
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
