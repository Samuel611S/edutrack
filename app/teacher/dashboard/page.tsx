"use client"

import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Calendar, BarChart3, LogOut, Plus, Edit2, Trash2, MapPin, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type Overview = {
  stats: { totalStudents: number; avgAttendance: number; activeCourses: number }
  courses: { id: string; course_code: string; course_name: string; semester: string; students: number; avgAttendance: number }[]
  lectures: {
    id: string
    date: string
    time: string
    course: string
    location: string
    enrolled: number
    attended: number
  }[]
  gradebook: Record<string, { enrollmentId: string; studentId: string; studentName: string; grade: string }[]>
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("courses")
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showLectureForm, setShowLectureForm] = useState(false)
  const [lectureCourseId, setLectureCourseId] = useState("")
  const [lectureDate, setLectureDate] = useState("")
  const [lectureStart, setLectureStart] = useState("10:00")
  const [lectureEnd, setLectureEnd] = useState("11:30")
  const [lectureLocation, setLectureLocation] = useState("Building A, Room 201")
  const [lectureLat, setLectureLat] = useState("30.0553")
  const [lectureLng, setLectureLng] = useState("31.3399")
  const [lectureRadius, setLectureRadius] = useState("100")
  const [saving, setSaving] = useState(false)
  const [rosterLectureId, setRosterLectureId] = useState<string | null>(null)
  const [roster, setRoster] = useState<{ student_id: string; full_name: string; status: string | null }[]>([])

  const load = async () => {
    const res = await fetch("/api/teacher/overview", { credentials: "include" })
    const json = await res.json()
    if (!res.ok) {
      setError(json.message || "Failed to load")
      return
    }
    setData(json)
    if (!lectureCourseId && json.courses?.length) setLectureCourseId(json.courses[0].id)
  }

  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        await load()
      } finally {
        if (!c) setLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const createLecture = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/teacher/lectures", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: lectureCourseId,
          lectureDate: lectureDate,
          startTime: lectureStart,
          endTime: lectureEnd,
          location: lectureLocation,
          latitude: Number(lectureLat),
          longitude: Number(lectureLng),
          allowedRadiusM: Number(lectureRadius),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || "Could not create lecture")
        return
      }
      setShowLectureForm(false)
      await load()
    } catch {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  const updateGrade = async (enrollmentId: string, grade: string) => {
    await fetch(`/api/teacher/enrollments/${enrollmentId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade }),
    })
    await load()
  }

  const openRoster = async (lectureId: string) => {
    setRosterLectureId(lectureId)
    const res = await fetch(`/api/teacher/lectures/${lectureId}/attendance`, { credentials: "include" })
    const json = await res.json()
    if (res.ok) setRoster(json.students || [])
  }

  const exportCourse = (courseId: string) => {
    window.open(`/api/teacher/export?courseId=${encodeURIComponent(courseId)}`, "_blank")
  }

  return (
    <ProtectedRoute allowedRoles={["teacher"]}>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teacher Portal</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-gray-900 font-medium">{user?.name}</p>
                <p className="text-gray-500 text-xs">Educator</p>
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

        <div className="max-w-7xl mx-auto px-4 py-8">
          {loading && <p className="text-gray-600">Loading…</p>}
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          {data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Students (seat count)</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.totalStudents}</p>
                      </div>
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Avg Attendance</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.avgAttendance}%</p>
                      </div>
                      <div className="bg-emerald-100 p-3 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Active Courses</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.activeCourses}</p>
                      </div>
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <Calendar className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white border border-gray-200 mb-6 flex flex-wrap h-auto gap-1">
                  <TabsTrigger value="courses" className="data-[state=active]:bg-gray-100">
                    My Courses
                  </TabsTrigger>
                  <TabsTrigger value="lectures" className="data-[state=active]:bg-gray-100">
                    Lectures
                  </TabsTrigger>
                  <TabsTrigger value="attendance" className="data-[state=active]:bg-gray-100">
                    Attendance Report
                  </TabsTrigger>
                  <TabsTrigger value="grades" className="data-[state=active]:bg-gray-100">
                    Grades
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="courses" className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">My Courses</h2>
                    <p className="text-sm text-gray-500">Course creation is available to administrators.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.courses.map((course) => (
                      <Card key={course.id} className="bg-white border-gray-200 shadow-sm">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-gray-900">{course.course_name}</CardTitle>
                              <CardDescription className="text-gray-600">
                                {course.course_code} • {course.semester}
                              </CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" type="button" title="View (placeholder)">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" type="button" title="Delete (placeholder)">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-gray-600 text-sm">Enrolled Students</p>
                              <p className="text-2xl font-bold text-gray-900">{course.students}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 text-sm">Avg Attendance</p>
                              <p className="text-2xl font-bold text-emerald-600">{course.avgAttendance}%</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => exportCourse(course.id)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export attendance (CSV)
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="lectures" className="space-y-4">
                  <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <h2 className="text-xl font-bold text-gray-900">Lectures</h2>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowLectureForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Schedule Lecture
                    </Button>
                  </div>

                  {showLectureForm && (
                    <Card className="border-blue-200 bg-blue-50/50">
                      <CardHeader>
                        <CardTitle className="text-lg">New lecture session</CardTitle>
                        <CardDescription>GPS coordinates are used for student check-in verification.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={createLecture} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <Label>Course</Label>
                            <select
                              className="w-full border rounded-md h-10 px-2 bg-white"
                              value={lectureCourseId}
                              onChange={(e) => setLectureCourseId(e.target.value)}
                              required
                            >
                              {data.courses.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.course_code} — {c.course_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label>Date</Label>
                            <Input type="date" value={lectureDate} onChange={(e) => setLectureDate(e.target.value)} required />
                          </div>
                          <div>
                            <Label>Radius (m)</Label>
                            <Input value={lectureRadius} onChange={(e) => setLectureRadius(e.target.value)} />
                          </div>
                          <div>
                            <Label>Start time</Label>
                            <Input value={lectureStart} onChange={(e) => setLectureStart(e.target.value)} />
                          </div>
                          <div>
                            <Label>End time</Label>
                            <Input value={lectureEnd} onChange={(e) => setLectureEnd(e.target.value)} />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Location label</Label>
                            <Input value={lectureLocation} onChange={(e) => setLectureLocation(e.target.value)} required />
                          </div>
                          <div>
                            <Label>Latitude</Label>
                            <Input value={lectureLat} onChange={(e) => setLectureLat(e.target.value)} required />
                          </div>
                          <div>
                            <Label>Longitude</Label>
                            <Input value={lectureLng} onChange={(e) => setLectureLng(e.target.value)} required />
                          </div>
                          <div className="md:col-span-2 flex gap-2">
                            <Button type="submit" disabled={saving}>
                              {saving ? "Saving…" : "Create"}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setShowLectureForm(false)}>
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-4">
                    {data.lectures.map((lecture) => (
                      <Card key={lecture.id} className="bg-white border-gray-200 shadow-sm">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-4">
                                <Calendar className="w-5 h-5 text-purple-600" />
                                <div>
                                  <p className="text-gray-900 font-semibold">{lecture.course}</p>
                                  <p className="text-gray-600 text-sm">
                                    {lecture.date} at {lecture.time}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 mb-4">
                                <MapPin className="w-5 h-5 text-pink-600" />
                                <p className="text-gray-700">{lecture.location}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-100 p-3 rounded">
                                  <p className="text-gray-600 text-xs">Enrolled</p>
                                  <p className="text-gray-900 font-semibold">{lecture.enrolled} students</p>
                                </div>
                                <div className="bg-emerald-100 p-3 rounded">
                                  <p className="text-gray-600 text-xs">Present (marked)</p>
                                  <p className="text-emerald-600 font-semibold">{lecture.attended} students</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                type="button"
                                onClick={() => openRoster(lecture.id)}
                              >
                                View roster
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {rosterLectureId && (
                    <Card className="border-slate-300">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Roster — lecture {rosterLectureId}</CardTitle>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setRosterLectureId(null)}>
                          Close
                        </Button>
                      </CardHeader>
                      <CardContent className="max-h-64 overflow-auto text-sm">
                        {roster.map((r) => (
                          <div key={r.student_id} className="flex justify-between py-1 border-b border-gray-100">
                            <span>{r.full_name}</span>
                            <span className={r.status === "present" ? "text-emerald-600" : "text-amber-600"}>
                              {r.status || "absent"}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="attendance" className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance Report</h2>

                  <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Course Attendance Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {data.courses.map((course) => (
                          <div key={course.id} className="border-b border-gray-200 pb-4 last:border-0">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-gray-900 font-medium">{course.course_name}</p>
                              <span className="text-emerald-600 font-semibold">{course.avgAttendance}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-emerald-600 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(100, course.avgAttendance)}%` }}
                              />
                            </div>
                            <p className="text-gray-600 text-xs mt-2">
                              Based on present marks vs. lectures × enrollments
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex flex-wrap gap-2">
                    {data.courses.map((c) => (
                      <Button key={c.id} type="button" variant="secondary" onClick={() => exportCourse(c.id)}>
                        <Download className="w-4 h-4 mr-2" />
                        Export {c.course_code}
                      </Button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="grades" className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Grade management</h2>
                  {data.courses.map((course) => (
                    <Card key={course.id}>
                      <CardHeader>
                        <CardTitle className="text-base">{course.course_name}</CardTitle>
                        <CardDescription>{course.course_code}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(data.gradebook[course.id] || []).map((row) => (
                          <div key={row.enrollmentId} className="flex items-center gap-3 flex-wrap">
                            <span className="flex-1 min-w-[140px] text-sm">{row.studentName}</span>
                            <Input
                              className="w-24 h-9"
                              defaultValue={row.grade}
                              onBlur={(e) => updateGrade(row.enrollmentId, e.target.value)}
                            />
                          </div>
                        ))}
                        {(data.gradebook[course.id] || []).length === 0 && (
                          <p className="text-sm text-gray-500">No enrollments.</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  )
}
