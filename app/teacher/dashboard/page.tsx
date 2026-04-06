"use client"

import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardEntrance } from "@/components/dashboard-entrance"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Users,
  Calendar,
  BarChart3,
  FileBarChart,
  LogOut,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Download,
  Save,
  BookOpen,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import campusGps from "@/lib/campus-gps.json"
import { endTimeFromStartPlusMinutes, LECTURE_DURATION_MINUTES } from "@/lib/lecture-duration"

type CourseRow = {
  id: string
  course_code: string
  course_name: string
  semester: string
  credits: number
  max_capacity: number | null
  description: string | null
  students: number
  avgAttendance: number
}

type Overview = {
  stats: { totalStudents: number; avgAttendance: number; activeCourses: number }
  courses: CourseRow[]
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

type RosterStudent = {
  enrollmentId: string
  studentId: string
  studentCode: string
  fullName: string
  email: string
  major: string
  grade: string
}

const emptyCourseForm = {
  course_code: "",
  course_name: "",
  description: "",
  semester: "2026-Spring",
  credits: "3",
  max_capacity: "",
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
  const [lectureEnd, setLectureEnd] = useState(() => endTimeFromStartPlusMinutes("10:00", LECTURE_DURATION_MINUTES) ?? "11:30")
  const [lectureLocation, setLectureLocation] = useState(String(campusGps.lectureLocations[0][0]))
  const [lectureLat, setLectureLat] = useState(String(campusGps.lectureLocations[0][1]))
  const [lectureLng, setLectureLng] = useState(String(campusGps.lectureLocations[0][2]))
  const [lectureRadius, setLectureRadius] = useState("100")
  const [saving, setSaving] = useState(false)
  const [rosterLectureId, setRosterLectureId] = useState<string | null>(null)
  const [roster, setRoster] = useState<{ student_id: string; full_name: string; status: string | null }[]>([])

  const [showNewCourse, setShowNewCourse] = useState(false)
  const [newCourse, setNewCourse] = useState(emptyCourseForm)

  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [editCourse, setEditCourse] = useState(emptyCourseForm)

  const [rosterCourseId, setRosterCourseId] = useState<string | null>(null)
  const [rosterRows, setRosterRows] = useState<RosterStudent[]>([])
  const [rosterMeta, setRosterMeta] = useState<{ course_code: string; course_name: string } | null>(null)
  const [rosterLoading, setRosterLoading] = useState(false)

  const [gradeDrafts, setGradeDrafts] = useState<Record<string, string>>({})
  const [savingGradesFor, setSavingGradesFor] = useState<string | null>(null)

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

  useEffect(() => {
    if (!data) return
    const next: Record<string, string> = {}
    for (const rows of Object.values(data.gradebook)) {
      for (const row of rows) {
        next[row.enrollmentId] = row.grade ?? ""
      }
    }
    setGradeDrafts(next)
  }, [data])

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const syncEndFromStart = (start: string) => {
    const next = endTimeFromStartPlusMinutes(start, LECTURE_DURATION_MINUTES)
    if (next) setLectureEnd(next)
  }

  const createLecture = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    const computedEnd = endTimeFromStartPlusMinutes(lectureStart, LECTURE_DURATION_MINUTES)
    if (!computedEnd) {
      setError(
        `Start time must allow a ${LECTURE_DURATION_MINUTES}-minute session the same day (latest start 22:29).`,
      )
      setSaving(false)
      return
    }
    if (lectureEnd !== computedEnd) setLectureEnd(computedEnd)
    try {
      const res = await fetch("/api/teacher/lectures", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: lectureCourseId,
          lectureDate: lectureDate,
          startTime: lectureStart,
          endTime: computedEnd,
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

  const saveGradesForCourse = async (courseId: string) => {
    if (!data) return
    const rows = data.gradebook[courseId] || []
    const grades: Record<string, string> = {}
    for (const r of rows) {
      grades[r.enrollmentId] = gradeDrafts[r.enrollmentId] ?? ""
    }
    setSavingGradesFor(courseId)
    setError("")
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/grades`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grades }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || "Could not save grades")
        return
      }
      await load()
    } catch {
      setError("Network error saving grades")
    } finally {
      setSavingGradesFor(null)
    }
  }

  const openRoster = async (lectureId: string) => {
    setRosterLectureId(lectureId)
    const res = await fetch(`/api/teacher/lectures/${lectureId}/attendance`, { credentials: "include" })
    const json = await res.json()
    if (res.ok) setRoster(json.students || [])
  }

  const openCourseRoster = async (courseId: string) => {
    setRosterCourseId(courseId)
    setRosterRows([])
    setRosterMeta(null)
    setRosterLoading(true)
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/roster`, { credentials: "include" })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || "Could not load roster")
        setRosterCourseId(null)
        return
      }
      setRosterMeta({ course_code: json.course.course_code, course_name: json.course.course_name })
      setRosterRows(json.students || [])
    } catch {
      setError("Network error")
      setRosterCourseId(null)
    } finally {
      setRosterLoading(false)
    }
  }

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/teacher/courses", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_code: newCourse.course_code,
          course_name: newCourse.course_name,
          description: newCourse.description || null,
          semester: newCourse.semester,
          credits: Number(newCourse.credits) || 3,
          max_capacity: newCourse.max_capacity === "" ? null : Number(newCourse.max_capacity),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || "Could not create course")
        return
      }
      setShowNewCourse(false)
      setNewCourse(emptyCourseForm)
      await load()
    } catch {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  const startEditCourse = (c: CourseRow) => {
    setEditingCourseId(c.id)
    setEditCourse({
      course_code: c.course_code,
      course_name: c.course_name,
      description: c.description ?? "",
      semester: c.semester,
      credits: String(c.credits),
      max_capacity: c.max_capacity != null ? String(c.max_capacity) : "",
    })
  }

  const saveEditCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourseId) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/teacher/courses/${editingCourseId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_code: editCourse.course_code,
          course_name: editCourse.course_name,
          description: editCourse.description,
          semester: editCourse.semester,
          credits: Number(editCourse.credits) || 3,
          max_capacity: editCourse.max_capacity === "" ? null : Number(editCourse.max_capacity),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || "Could not update course")
        return
      }
      setEditingCourseId(null)
      await load()
    } catch {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  const deleteCourse = async (courseId: string, name: string) => {
    if (!window.confirm(`Delete course "${name}"? This removes lectures, attendance, and enrollments.`)) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}`, { method: "DELETE", credentials: "include" })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || "Could not delete")
        return
      }
      if (editingCourseId === courseId) setEditingCourseId(null)
      await load()
    } catch {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  const exportCourse = (courseId: string) => {
    window.open(`/api/teacher/export?courseId=${encodeURIComponent(courseId)}`, "_blank")
  }

  return (
    <ProtectedRoute allowedRoles={["teacher"]}>
      <DashboardEntrance>
        <main className="min-h-screen edu-dashboard-bg">
          <header className="edu-dashboard-header sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-md shadow-sm shadow-indigo-950/5">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Teacher Portal</h1>
              </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
              <Button
                asChild
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <Link href="/teacher/reports" className="gap-2">
                  <FileBarChart className="w-4 h-4" />
                  Attendance reports
                </Link>
              </Button>
              <div className="text-right hidden sm:block">
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

          <div className="max-w-7xl mx-auto px-4 py-8 edu-tabs-enter">
            {loading && <p className="text-slate-600 text-sm animate-pulse">Loading…</p>}
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

            {data && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 edu-stat-stagger">
                  <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 hover:shadow-lg transition-shadow duration-300">
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

                  <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 hover:shadow-lg transition-shadow duration-300">
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

                  <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 hover:shadow-lg transition-shadow duration-300">
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
                  <TabsList className="mb-6 inline-flex h-auto flex-wrap gap-1 rounded-xl border border-white/80 bg-white/70 p-1.5 shadow-sm backdrop-blur-sm">
                    <TabsTrigger
                      value="courses"
                      className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600"
                    >
                      My Courses
                    </TabsTrigger>
                    <TabsTrigger
                      value="lectures"
                      className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600"
                    >
                      Lectures
                    </TabsTrigger>
                    <TabsTrigger
                      value="attendance"
                      className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600"
                    >
                      Attendance Report
                    </TabsTrigger>
                    <TabsTrigger
                      value="grades"
                      className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600"
                    >
                      Grades
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="courses" className="space-y-4">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                      <h2 className="text-xl font-bold text-gray-900">My Courses</h2>
                      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setShowNewCourse(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add course
                      </Button>
                    </div>

                    {showNewCourse && (
                      <Card className="border-indigo-200 bg-indigo-50/50">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            New course
                          </CardTitle>
                          <CardDescription>Create a course you teach. You can edit details anytime.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={createCourse} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Course code</Label>
                              <Input
                                value={newCourse.course_code}
                                onChange={(e) => setNewCourse((p) => ({ ...p, course_code: e.target.value }))}
                                required
                                placeholder="e.g. CS410"
                              />
                            </div>
                            <div>
                              <Label>Semester</Label>
                              <Input
                                value={newCourse.semester}
                                onChange={(e) => setNewCourse((p) => ({ ...p, semester: e.target.value }))}
                                required
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label>Course name</Label>
                              <Input
                                value={newCourse.course_name}
                                onChange={(e) => setNewCourse((p) => ({ ...p, course_name: e.target.value }))}
                                required
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label>Description</Label>
                              <textarea
                                className="w-full min-h-[88px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                value={newCourse.description}
                                onChange={(e) => setNewCourse((p) => ({ ...p, description: e.target.value }))}
                                placeholder="Syllabus summary, topics, prerequisites…"
                              />
                            </div>
                            <div>
                              <Label>Credits</Label>
                              <Input
                                type="number"
                                min={1}
                                value={newCourse.credits}
                                onChange={(e) => setNewCourse((p) => ({ ...p, credits: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label>Max capacity (optional)</Label>
                              <Input
                                type="number"
                                min={1}
                                value={newCourse.max_capacity}
                                onChange={(e) => setNewCourse((p) => ({ ...p, max_capacity: e.target.value }))}
                                placeholder="e.g. 40"
                              />
                            </div>
                            <div className="md:col-span-2 flex gap-2">
                              <Button type="submit" disabled={saving} className="bg-indigo-600">
                                {saving ? "Saving…" : "Create course"}
                              </Button>
                              <Button type="button" variant="outline" onClick={() => setShowNewCourse(false)}>
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </CardContent>
                      </Card>
                    )}

                    {editingCourseId && (
                      <Card className="border-amber-200 bg-amber-50/40">
                        <CardHeader>
                          <CardTitle className="text-lg">Edit course</CardTitle>
                          <CardDescription>Update catalog details for this course.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={saveEditCourse} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Course code</Label>
                              <Input
                                value={editCourse.course_code}
                                onChange={(e) => setEditCourse((p) => ({ ...p, course_code: e.target.value }))}
                                required
                              />
                            </div>
                            <div>
                              <Label>Semester</Label>
                              <Input
                                value={editCourse.semester}
                                onChange={(e) => setEditCourse((p) => ({ ...p, semester: e.target.value }))}
                                required
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label>Course name</Label>
                              <Input
                                value={editCourse.course_name}
                                onChange={(e) => setEditCourse((p) => ({ ...p, course_name: e.target.value }))}
                                required
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label>Description</Label>
                              <textarea
                                className="w-full min-h-[88px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                value={editCourse.description}
                                onChange={(e) => setEditCourse((p) => ({ ...p, description: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label>Credits</Label>
                              <Input
                                type="number"
                                min={1}
                                value={editCourse.credits}
                                onChange={(e) => setEditCourse((p) => ({ ...p, credits: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label>Max capacity</Label>
                              <Input
                                type="number"
                                min={1}
                                value={editCourse.max_capacity}
                                onChange={(e) => setEditCourse((p) => ({ ...p, max_capacity: e.target.value }))}
                                placeholder="Optional"
                              />
                            </div>
                            <div className="md:col-span-2 flex gap-2">
                              <Button type="submit" disabled={saving} className="bg-indigo-600">
                                {saving ? "Saving…" : "Save changes"}
                              </Button>
                              <Button type="button" variant="outline" onClick={() => setEditingCourseId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.courses.map((course) => (
                        <Card key={course.id} className="bg-white border-gray-200 shadow-sm">
                          <CardHeader>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <CardTitle className="text-gray-900">{course.course_name}</CardTitle>
                                <CardDescription className="text-gray-600">
                                  {course.course_code} • {course.semester} • {course.credits} cr
                                </CardDescription>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  type="button"
                                  title="Edit course"
                                  onClick={() => startEditCourse(course)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  type="button"
                                  title="Delete course"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => deleteCourse(course.id, course.course_name)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            {course.description && (
                              <p className="text-sm text-slate-600 leading-relaxed pt-1">{course.description}</p>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-gray-600 text-sm">Enrolled</p>
                                <p className="text-2xl font-bold text-gray-900">{course.students}</p>
                              </div>
                              <div>
                                <p className="text-gray-600 text-sm">Avg attendance</p>
                                <p className="text-2xl font-bold text-emerald-600">{course.avgAttendance}%</p>
                              </div>
                            </div>
                            {course.max_capacity != null && (
                              <p className="text-xs text-slate-500">Capacity cap: {course.max_capacity}</p>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button type="button" variant="secondary" className="w-full sm:flex-1" onClick={() => openCourseRoster(course.id)}>
                                <Users className="w-4 h-4 mr-2" />
                                View roster
                              </Button>
                              <Button type="button" variant="outline" className="w-full sm:flex-1" onClick={() => exportCourse(course.id)}>
                                <Download className="w-4 h-4 mr-2" />
                                Export CSV
                              </Button>
                            </div>
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
                        Schedule lecture
                      </Button>
                    </div>

                    {showLectureForm && (
                      <Card className="border-blue-200 bg-blue-50/50">
                        <CardHeader>
                          <CardTitle className="text-lg">New lecture session</CardTitle>
                          <CardDescription>
                            Sessions are always {LECTURE_DURATION_MINUTES} minutes (end time follows start). GPS is used
                            for student check-in.
                          </CardDescription>
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
                              <Input
                                type="time"
                                value={lectureStart.length === 5 ? lectureStart : lectureStart.slice(0, 5)}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setLectureStart(v)
                                  syncEndFromStart(v)
                                }}
                                required
                              />
                              <p className="text-xs text-slate-500 mt-1">
                                End is fixed at {LECTURE_DURATION_MINUTES} minutes later (attendance policy).
                              </p>
                            </div>
                            <div>
                              <Label>End time</Label>
                              <Input value={lectureEnd} readOnly className="bg-slate-100 text-slate-700 cursor-not-allowed" />
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
                                  Attendance roster
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
                          <CardTitle className="text-base">Attendance — lecture {rosterLectureId}</CardTitle>
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
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance report</h2>

                    <Card className="bg-white border-gray-200 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-gray-900">Course attendance statistics</CardTitle>
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
                              <p className="text-gray-600 text-xs mt-2">Based on present marks vs. lectures × enrollments</p>
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
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Grade management</h2>
                    <p className="text-sm text-slate-600 mb-4">
                      Edit letter grades, then press <strong>Save grades</strong> to update the database for that course.
                    </p>
                    {data.courses.map((course) => (
                      <Card key={course.id}>
                        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">{course.course_name}</CardTitle>
                            <CardDescription>{course.course_code}</CardDescription>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700"
                            disabled={savingGradesFor === course.id}
                            onClick={() => saveGradesForCourse(course.id)}
                          >
                            {savingGradesFor === course.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving…
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save grades
                              </>
                            )}
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {(data.gradebook[course.id] || []).map((row) => (
                            <div key={row.enrollmentId} className="flex items-center gap-3 flex-wrap">
                              <span className="flex-1 min-w-[160px] text-sm">{row.studentName}</span>
                              <Input
                                className="w-28 h-9 font-mono"
                                value={gradeDrafts[row.enrollmentId] ?? ""}
                                onChange={(e) =>
                                  setGradeDrafts((prev) => ({ ...prev, [row.enrollmentId]: e.target.value }))
                                }
                                placeholder="A, B+, …"
                              />
                            </div>
                          ))}
                          {(data.gradebook[course.id] || []).length === 0 && (
                            <p className="text-sm text-gray-500">No enrollments in this course yet.</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>

                {rosterCourseId && (
                  <Card className="mt-6 border-indigo-200 shadow-lg">
                    <CardHeader className="flex flex-row items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">Course roster</CardTitle>
                        {rosterMeta && (
                          <CardDescription>
                            {rosterMeta.course_code} — {rosterMeta.course_name}
                          </CardDescription>
                        )}
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setRosterCourseId(null)}>
                        Close
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {rosterLoading ? (
                        <p className="text-sm text-slate-600">Loading roster…</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left text-slate-600">
                                <th className="py-2 pr-3">Student</th>
                                <th className="py-2 pr-3">ID</th>
                                <th className="py-2 pr-3">Email</th>
                                <th className="py-2 pr-3">Major</th>
                                <th className="py-2">Grade</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rosterRows.map((r) => (
                                <tr key={r.enrollmentId} className="border-b border-slate-100">
                                  <td className="py-2 pr-3 font-medium text-gray-900">{r.fullName}</td>
                                  <td className="py-2 pr-3 font-mono text-xs">{r.studentCode}</td>
                                  <td className="py-2 pr-3 text-slate-600">{r.email}</td>
                                  <td className="py-2 pr-3">{r.major || "—"}</td>
                                  <td className="py-2 font-mono">{r.grade || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {rosterRows.length === 0 && !rosterLoading && (
                            <p className="text-sm text-slate-500 mt-2">No students enrolled in this course.</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </main>
      </DashboardEntrance>
    </ProtectedRoute>
  )
}
