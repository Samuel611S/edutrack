"use client"

import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardEntrance } from "@/components/dashboard-entrance"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BookOpen, BarChart3, LogOut, FileText } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type Overview = {
  stats: { students: number; teachers: number; courses: number; avgAttendance: number }
  recentActivity: { type: string; description: string; time: string }[]
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    ;(async () => {
      const res = await fetch("/api/admin/overview", { credentials: "include" })
      const json = await res.json()
      if (!c && res.ok) setData(json)
      if (!c) setLoading(false)
    })()
    return () => {
      c = true
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardEntrance>
        <main className="min-h-screen edu-dashboard-bg-admin">
          <header className="edu-dashboard-header sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-md shadow-sm shadow-indigo-950/5">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">EduTrack+ Admin</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-gray-900 font-medium">{user?.name}</p>
                <p className="text-gray-500 text-xs">Administrator</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-4 py-8 edu-tabs-enter">
          {loading && <p className="text-slate-600 text-sm animate-pulse">Loading…</p>}

          {data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 edu-stat-stagger">
                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Total Students</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.students}</p>
                      </div>
                      <div className="bg-emerald-100 p-3 rounded-lg">
                        <Users className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Active Teachers</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.teachers}</p>
                      </div>
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Avg Attendance</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.avgAttendance}%</p>
                      </div>
                      <div className="bg-amber-100 p-3 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Courses</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.courses}</p>
                      </div>
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 edu-stat-stagger">
                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 transition-all duration-300 hover:shadow-lg hover:border-indigo-200/60 hover:-translate-y-0.5 cursor-pointer">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-gray-900">Manage Students</CardTitle>
                      </div>
                      <Users className="w-8 h-8 text-emerald-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                      <Link href="/admin/students">Go to Students</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 transition-all duration-300 hover:shadow-lg hover:border-indigo-200/60 hover:-translate-y-0.5 cursor-pointer">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-gray-900">Course Requests</CardTitle>
                      </div>
                      <FileText className="w-8 h-8 text-indigo-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" asChild>
                      <Link href="/admin/requests">Open Requests</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 transition-all duration-300 hover:shadow-lg hover:border-indigo-200/60 hover:-translate-y-0.5 cursor-pointer">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-gray-900">Manage Teachers</CardTitle>
                      </div>
                      <BookOpen className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" asChild>
                      <Link href="/admin/teachers">Go to Teachers</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 transition-all duration-300 hover:shadow-lg hover:border-indigo-200/60 hover:-translate-y-0.5 cursor-pointer">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-gray-900">Attendance Reports</CardTitle>
                      </div>
                      <BarChart3 className="w-8 h-8 text-amber-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white" asChild>
                      <Link href="/admin/reports">View Reports</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 transition-all duration-300 hover:shadow-lg hover:border-indigo-200/60 hover:-translate-y-0.5 cursor-pointer">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-gray-900">Manage Courses</CardTitle>
                      </div>
                      <FileText className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" asChild>
                      <Link href="/admin/courses">Go to Courses</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 transition-all duration-300 hover:shadow-lg hover:border-indigo-200/60 hover:-translate-y-0.5 cursor-pointer">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-gray-900">Campus Map</CardTitle>
                      </div>
                      <Users className="w-8 h-8 text-pink-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white" asChild>
                      <Link href="/admin/campus-map">Open Campus Map</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5">
                <CardHeader>
                  <CardTitle className="text-gray-900">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.recentActivity.length === 0 && (
                      <p className="text-sm text-gray-500">No attendance records yet.</p>
                    )}
                    {data.recentActivity.map((activity, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between pb-4 border-b border-gray-200 last:border-0"
                      >
                        <div>
                          <p className="text-gray-900 font-medium">{activity.type}</p>
                          <p className="text-gray-600 text-sm mt-1">{activity.description}</p>
                        </div>
                        <span className="text-gray-500 text-xs whitespace-nowrap ml-4">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
        </main>
      </DashboardEntrance>
    </ProtectedRoute>
  )
}
