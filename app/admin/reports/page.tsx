"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { AdminPageShell } from "@/components/admin-page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, FileJson, PieChart, Users } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

type Summary = { totalRows: number; present: number; absent: number; attendanceRate: number }
type ByCourse = { course_code: string; course_name: string; present: number; total: number; rate: number }
type RecordRow = {
  course_code: string
  course_name: string
  lecture_date: string
  start_time: string
  student_id: string
  full_name: string
  status: string
  check_in_time: string | null
}

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [byCourse, setByCourse] = useState<ByCourse[]>([])
  const [sample, setSample] = useState<RecordRow[]>([])

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/reports/attendance", { credentials: "include" })
      const j = await res.json()
      if (res.ok) {
        setSummary(j.summary ?? null)
        setByCourse(j.byCourse ?? [])
        setSample(j.records ?? [])
      }
      setLoading(false)
    })()
  }, [])

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminPageShell title="Attendance intelligence" subtitle="Campus-wide attendance analytics and exports">
        {loading ? (
          <p className="text-slate-600 animate-pulse">Loading reports…</p>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-md">
                <CardHeader className="pb-2">
                  <CardDescription className="text-indigo-700 font-medium">Total marks</CardDescription>
                  <CardTitle className="text-3xl font-bold text-indigo-950">{summary?.totalRows ?? 0}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600">Rows in attendance table (all courses)</CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 shadow-md">
                <CardHeader className="pb-2">
                  <CardDescription className="text-emerald-800 font-medium">Present</CardDescription>
                  <CardTitle className="text-3xl font-bold text-emerald-900">{summary?.present ?? 0}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600">Checked-in as present</CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100 shadow-md">
                <CardHeader className="pb-2">
                  <CardDescription className="text-amber-900 font-medium">Absent / other</CardDescription>
                  <CardTitle className="text-3xl font-bold text-amber-950">{summary?.absent ?? 0}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600">Not present or other status</CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-violet-50 to-white border-violet-100 shadow-md">
                <CardHeader className="pb-2">
                  <CardDescription className="text-violet-800 font-medium">Overall rate</CardDescription>
                  <CardTitle className="text-3xl font-bold text-violet-950">{summary?.attendanceRate ?? 0}%</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600">Present ÷ total rows</CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                <a href="/api/admin/reports/attendance?format=csv" download className="gap-2">
                  <Download className="w-4 h-4" />
                  Download full CSV
                </a>
              </Button>
              <Button variant="outline" asChild className="bg-white border-slate-200">
                <Link href="/api/admin/reports/attendance" target="_blank" className="gap-2">
                  <FileJson className="w-4 h-4" />
                  Open JSON (preview)
                </Link>
              </Button>
            </div>

            <Card className="bg-white/95 border-white/80 shadow-lg overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-indigo-600" />
                  <CardTitle className="text-lg">By course</CardTitle>
                </div>
                <CardDescription>Present / total marks per course code</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white shadow-sm">
                      <tr className="text-left text-slate-600 border-b">
                        <th className="py-3 px-4 font-semibold">Code</th>
                        <th className="py-3 px-4 font-semibold">Course</th>
                        <th className="py-3 px-4 font-semibold">Present</th>
                        <th className="py-3 px-4 font-semibold">Total</th>
                        <th className="py-3 px-4 font-semibold">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byCourse.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 px-4 text-center text-slate-500">
                            No attendance data yet — students need to check in to lectures.
                          </td>
                        </tr>
                      )}
                      {byCourse.map((r) => (
                        <tr key={r.course_code} className="border-b border-slate-50 hover:bg-indigo-50/40">
                          <td className="py-2.5 px-4 font-mono font-semibold text-indigo-700">{r.course_code}</td>
                          <td className="py-2.5 px-4 max-w-xs truncate">{r.course_name}</td>
                          <td className="py-2.5 px-4 text-emerald-700 font-medium">{r.present}</td>
                          <td className="py-2.5 px-4">{r.total}</td>
                          <td className="py-2.5 px-4">
                            <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-800 px-2 py-0.5 text-xs font-semibold">
                              {r.rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 border-white/80 shadow-lg">
              <CardHeader className="border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-700" />
                  <CardTitle className="text-lg">Recent sample</CardTitle>
                </div>
                <CardDescription>First {sample.length} rows (full dataset in CSV)</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead className="sticky top-0 bg-white">
                      <tr className="text-left text-slate-600 border-b">
                        <th className="py-2 px-3">Course</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Student</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Check-in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sample.map((r, i) => (
                        <tr key={`${r.student_id}-${i}`} className="border-b border-slate-50">
                          <td className="py-2 px-3 font-mono text-xs">{r.course_code}</td>
                          <td className="py-2 px-3 whitespace-nowrap">{String(r.lecture_date).slice(0, 10)}</td>
                          <td className="py-2 px-3">{r.full_name}</td>
                          <td className="py-2 px-3">
                            <span
                              className={
                                r.status === "present" ? "text-emerald-600 font-medium" : "text-amber-700"
                              }
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-xs text-slate-600">{r.check_in_time ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </AdminPageShell>
    </ProtectedRoute>
  )
}
