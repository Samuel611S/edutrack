"use client"

import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardEntrance } from "@/components/dashboard-entrance"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BookOpen,
  Calendar,
  BarChart3,
  LogOut,
  CheckCircle,
  AlertCircle,
  MapPin,
  Clock,
  TrendingUp,
  Award,
  Download,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type Overview = {
  stats: { enrolledCourses: number; avgAttendance: number; gpa: number; upcomingCount: number }
  attendanceSummary: { attended: number; missed: number }
  courses: {
    id: string
    code: string
    name: string
    teacher: string
    grade: string
    attendance: number
    progress: number
  }[]
  upcomingLectures: { id: string; course: string; date: string; time: string; location: string; attended: boolean }[]
  materialsByCourse: {
    code: string
    name: string
    items: { id: string; title: string; type: string; href: string | null }[]
  }[]
}

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("courses")
  const [data, setData] = useState<Overview | null>(null)
  const [loadError, setLoadError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/student/overview", { credentials: "include" })
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setLoadError(json.message || "Failed to load dashboard")
          return
        }
        setData(json)
      } catch {
        if (!cancelled) setLoadError("Network error")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const downloadSummary = () => {
    if (!data) return
    const text = JSON.stringify(
      {
        student: user?.name,
        stats: data.stats,
        attendanceSummary: data.attendanceSummary,
        courses: data.courses,
      },
      null,
      2,
    )
    const blob = new Blob([text], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "edutrack-attendance-summary.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <DashboardEntrance>
        <main className="min-h-screen edu-dashboard-bg">
          <header className="edu-dashboard-header sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-md shadow-sm shadow-indigo-950/5">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Portal</h1>
              <div className="flex gap-3 mt-1 text-sm">
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => router.push("/student/attendance")}
                >
                  Quick check-in
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => router.push("/student/attendance-map")}
                >
                  Map + face check-in
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-gray-900 font-medium">{user?.name}</p>
                <p className="text-gray-500 text-xs">Student</p>
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
          {loading && (
            <p className="text-slate-600 text-sm animate-pulse">Loading your dashboard…</p>
          )}
          {loadError && <p className="text-red-600">{loadError}</p>}

          {data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 edu-stat-stagger">
                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Enrolled Courses</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.enrolledCourses}</p>
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
                        <p className="text-emerald-600 text-xs mt-2 flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          From recorded lectures
                        </p>
                      </div>
                      <div className="bg-emerald-100 p-3 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">GPA</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.gpa}</p>
                        <p className="text-purple-600 text-xs mt-2 flex items-center">
                          <Award className="w-3 h-3 mr-1" />
                          From enrollments
                        </p>
                      </div>
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <Award className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Upcoming Lectures</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.upcomingCount}</p>
                        <p className="text-amber-600 text-xs mt-2 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Scheduled ahead
                        </p>
                      </div>
                      <div className="bg-amber-100 p-3 rounded-lg">
                        <Calendar className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-6 inline-flex h-auto flex-wrap gap-1 rounded-xl border border-white/80 bg-white/70 p-1.5 shadow-sm backdrop-blur-sm">
                  <TabsTrigger
                    value="courses"
                    className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600"
                  >
                    My Courses
                  </TabsTrigger>
                  <TabsTrigger
                    value="attendance"
                    className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600"
                  >
                    My Attendance
                  </TabsTrigger>
                  <TabsTrigger
                    value="upcoming"
                    className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600"
                  >
                    Upcoming Lectures
                  </TabsTrigger>
                  <TabsTrigger
                    value="materials"
                    className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600"
                  >
                    Course Materials
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="courses" className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Enrolled Courses</h2>
                  <div className="space-y-4">
                    {data.courses.map((course) => (
                      <Card key={course.id} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="text-gray-600 text-sm">{course.code}</p>
                              <h3 className="text-xl font-bold text-gray-900 mt-1">{course.name}</h3>
                              <p className="text-gray-600 text-sm mt-2">Instructor: {course.teacher}</p>
                            </div>
                            <div className="text-right">
                              <div className="bg-emerald-100 px-3 py-2 rounded">
                                <p className="text-emerald-600 font-bold text-lg">{course.grade}</p>
                                <p className="text-gray-600 text-xs">Current Grade</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-gray-600 text-sm">Course Progress</p>
                                <span className="text-gray-900 font-semibold">{course.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${course.progress}%` }}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-gray-600 text-sm">Attendance Rate</p>
                                <span className="text-emerald-600 font-semibold">{course.attendance}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-emerald-600 h-2 rounded-full"
                                  style={{ width: `${Math.min(100, course.attendance)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="attendance" className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance Summary</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <Card className="bg-white border-gray-200 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-gray-900 text-sm">Sessions marked present</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <p className="text-4xl font-bold text-emerald-600">{data.attendanceSummary.attended}</p>
                          <CheckCircle className="w-12 h-12 text-emerald-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border-gray-200 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-gray-900 text-sm">Sessions not marked</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <p className="text-4xl font-bold text-amber-600">{data.attendanceSummary.missed}</p>
                          <AlertCircle className="w-12 h-12 text-amber-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Course-wise Attendance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {data.courses.map((course) => (
                          <div key={course.id} className="pb-4 border-b border-gray-200 last:border-0">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-gray-900 font-medium">
                                {course.code} - {course.name}
                              </p>
                              <span className="text-emerald-600">{course.attendance}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-emerald-600 h-2 rounded-full"
                                style={{ width: `${Math.min(100, course.attendance)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    type="button"
                    onClick={downloadSummary}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download attendance summary (JSON)
                  </Button>
                </TabsContent>

                <TabsContent value="upcoming" className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Lectures</h2>
                  <div className="space-y-4">
                    {data.upcomingLectures.length === 0 && (
                      <p className="text-gray-600 text-sm">No upcoming lectures in the database.</p>
                    )}
                    {data.upcomingLectures.map((lecture) => (
                      <Card
                        key={lecture.id}
                        className={`border transition ${
                          lecture.attended ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200"
                        } shadow-sm`}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <Calendar className="w-5 h-5 text-purple-600" />
                                <div>
                                  <p className="text-gray-900 font-semibold">{lecture.course}</p>
                                  <p className="text-gray-600 text-sm">
                                    {lecture.date} at {lecture.time}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <MapPin className="w-5 h-5 text-pink-600" />
                                <p className="text-gray-700">{lecture.location}</p>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              {lecture.attended ? (
                                <div className="bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                                  <span className="text-emerald-600 text-sm font-semibold">Attended</span>
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                                  onClick={() => router.push("/student/attendance")}
                                >
                                  Mark Attendance
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="materials" className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Course Materials</h2>
                  <div className="space-y-4">
                    {data.materialsByCourse.length === 0 && (
                      <p className="text-gray-600 text-sm">No materials linked to your lectures yet.</p>
                    )}
                    {data.materialsByCourse.map((group) => (
                      <Card key={group.code} className="bg-white border-gray-200 shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-gray-900">{group.name}</CardTitle>
                          <CardDescription className="text-gray-600">{group.code}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {group.items.map((material) => (
                            <div
                              key={material.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition"
                            >
                              <div className="flex items-center gap-3">
                                <BookOpen className="w-4 h-4 text-blue-600" />
                                <div>
                                  <p className="text-gray-900 text-sm font-medium">{material.title}</p>
                                  <p className="text-gray-600 text-xs">{material.type}</p>
                                </div>
                              </div>
                              <Download className="w-4 h-4 text-gray-600" />
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
        </main>
      </DashboardEntrance>
    </ProtectedRoute>
  )
}
