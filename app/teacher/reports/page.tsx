"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { DashboardEntrance } from "@/components/dashboard-entrance"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, PieChart, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

type Summary = { totalRows: number; present: number; absent: number; attendanceRate: number }
type ByCourse = { course_code: string; course_name: string; present: number; total: number; rate: number }
type RecordRow = {
  course_code: string
  course_name: string
  lecture_date: string
  student_id: string
  full_name: string
  status: string
  check_in_time: string | null
}

export default function TeacherReportsPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [byCourse, setByCourse] = useState<ByCourse[]>([])
  const [sample, setSample] = useState<RecordRow[]>([])

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/teacher/reports/attendance", { credentials: "include" })
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
    <ProtectedRoute allowedRoles={["teacher", "admin"]}>
      <DashboardEntrance>
        <main className="min-h-screen edu-dashboard-bg">
          <header className="edu-dashboard-header sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-md shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Attendance reports</h1>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/teacher/dashboard" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Dashboard
                </Link>
              </Button>
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-4 py-8">
            {loading ? (
              <p className="text-slate-600 animate-pulse">Loading your reports…</p>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-white/95 border-indigo-100 shadow-md">
                    <CardHeader className="pb-2">
                      <CardDescription>Your marks</CardDescription>
                      <CardTitle className="text-3xl font-bold text-indigo-950">{summary?.totalRows ?? 0}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-white/95 border-emerald-100 shadow-md">
                    <CardHeader className="pb-2">
                      <CardDescription>Present</CardDescription>
                      <CardTitle className="text-3xl font-bold text-emerald-800">{summary?.present ?? 0}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-white/95 border-amber-100 shadow-md">
                    <CardHeader className="pb-2">
                      <CardDescription>Absent / other</CardDescription>
                      <CardTitle className="text-3xl font-bold text-amber-900">{summary?.absent ?? 0}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-white/95 border-violet-100 shadow-md">
                    <CardHeader className="pb-2">
                      <CardDescription>Your rate</CardDescription>
                      <CardTitle className="text-3xl font-bold text-violet-950">{summary?.attendanceRate ?? 0}%</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
                    <a href="/api/teacher/reports/attendance?format=csv" download className="gap-2">
                      <Download className="w-4 h-4" />
                      Export my CSV
                    </a>
                  </Button>
                </div>

                <Card className="bg-white/95 shadow-lg border-white/80">
                  <CardHeader className="border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-indigo-600" />
                      <CardTitle className="text-lg">Per course</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50">
                          <tr className="text-left text-slate-600 border-b">
                            <th className="py-3 px-4 font-semibold">Code</th>
                            <th className="py-3 px-4 font-semibold">Course</th>
                            <th className="py-3 px-4">Present</th>
                            <th className="py-3 px-4">Total</th>
                            <th className="py-3 px-4">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {byCourse.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-10 text-center text-slate-500">No records.</td>
                            </tr>
                          )}
                          {byCourse.map((r) => (
                            <tr key={r.course_code} className="border-b border-slate-50 hover:bg-indigo-50/50">
                              <td className="py-2.5 px-4 font-mono font-semibold text-indigo-700">{r.course_code}</td>
                              <td className="py-2.5 px-4">{r.course_name}</td>
                              <td className="py-2.5 px-4 text-emerald-700">{r.present}</td>
                              <td className="py-2.5 px-4">{r.total}</td>
                              <td className="py-2.5 px-4">
                                <span className="rounded-full bg-indigo-100 text-indigo-900 px-2 py-0.5 text-xs font-semibold">
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

                <Card className="bg-white/95 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">Sample rows</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto max-h-[320px] overflow-y-auto p-0 sm:p-6 pt-0">
                    <table className="w-full text-sm min-w-[720px]">
                      <thead>
                        <tr className="text-left text-slate-600 border-b">
                          <th className="py-2 px-3">Course</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Student</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sample.map((r, i) => (
                          <tr key={`${r.student_id}-${i}`} className="border-b border-slate-50">
                            <td className="py-2 px-3 font-mono text-xs">{r.course_code}</td>
                            <td className="py-2 px-3">{String(r.lecture_date).slice(0, 10)}</td>
                            <td className="py-2 px-3">{r.full_name}</td>
                            <td className="py-2 px-3">{r.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </DashboardEntrance>
    </ProtectedRoute>
  )
}
