"use client"

import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Calendar, BarChart3, LogOut, Plus, Edit2, Trash2, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface Course {
  id: string
  name: string
  code: string
  semester: string
  students: number
  avgAttendance: number
}

interface Lecture {
  id: string
  date: string
  time: string
  course: string
  location: string
  enrolled: number
  attended: number
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("courses")

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const mockCourses: Course[] = [
    {
      id: "course_001",
      name: "Advanced Database Systems",
      code: "CS301",
      semester: "2025-Spring",
      students: 32,
      avgAttendance: 92,
    },
    {
      id: "course_002",
      name: "Web Development",
      code: "CS205",
      semester: "2025-Spring",
      students: 28,
      avgAttendance: 88,
    },
  ]

  const mockLectures: Lecture[] = [
    {
      id: "lec_001",
      date: "2025-01-15",
      time: "10:00 AM",
      course: "CS301",
      location: "Building A, Room 201",
      enrolled: 32,
      attended: 30,
    },
    {
      id: "lec_002",
      date: "2025-01-22",
      time: "10:00 AM",
      course: "CS301",
      location: "Building A, Room 201",
      enrolled: 32,
      attended: 28,
    },
    {
      id: "lec_003",
      date: "2025-01-16",
      time: "2:00 PM",
      course: "CS205",
      location: "Building B, Room 105",
      enrolled: 28,
      attended: 25,
    },
  ]

  return (
    <ProtectedRoute allowedRoles={["teacher"]}>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        {/* Header */}
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

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Students</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">60</p>
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
                    <p className="text-3xl font-bold text-gray-900 mt-1">90%</p>
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
                    <p className="text-3xl font-bold text-gray-900 mt-1">2</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white border border-gray-200 mb-6">
              <TabsTrigger value="courses" className="data-[state=active]:bg-gray-100">
                My Courses
              </TabsTrigger>
              <TabsTrigger value="lectures" className="data-[state=active]:bg-gray-100">
                Upcoming Lectures
              </TabsTrigger>
              <TabsTrigger value="attendance" className="data-[state=active]:bg-gray-100">
                Attendance Report
              </TabsTrigger>
            </TabsList>

            {/* Courses Tab */}
            <TabsContent value="courses" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">My Courses</h2>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Course
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockCourses.map((course) => (
                  <Card key={course.id} className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-gray-900">{course.name}</CardTitle>
                          <CardDescription className="text-gray-600">
                            {course.code} • {course.semester}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-red-600 hover:bg-red-50 bg-transparent"
                          >
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
                      <Button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900">View Details</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Lectures Tab */}
            <TabsContent value="lectures" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Upcoming Lectures</h2>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Lecture
                </Button>
              </div>

              <div className="space-y-4">
                {mockLectures.map((lecture) => (
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
                              <p className="text-gray-600 text-xs">Expected Attendance</p>
                              <p className="text-emerald-600 font-semibold">{lecture.attended} students</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Mark Attendance
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Attendance Report Tab */}
            <TabsContent value="attendance" className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance Report</h2>

              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900">Course Attendance Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockCourses.map((course) => (
                      <div key={course.id} className="border-b border-gray-200 pb-4 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-gray-900 font-medium">{course.name}</p>
                          <span className="text-emerald-600 font-semibold">{course.avgAttendance}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-emerald-600 h-2 rounded-full transition-all"
                            style={{ width: `${course.avgAttendance}%` }}
                          ></div>
                        </div>
                        <p className="text-gray-600 text-xs mt-2">
                          {Math.round(course.students * (course.avgAttendance / 100))} of {course.students} students
                          attending
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Export Full Report</Button>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </ProtectedRoute>
  )
}
