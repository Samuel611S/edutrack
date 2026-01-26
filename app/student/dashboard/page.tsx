"use client"

import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
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
import { useState } from "react"

interface EnrolledCourse {
  id: string
  code: string
  name: string
  teacher: string
  attendance: number
  grade?: string
  progress: number
}

interface UpcomingLecture {
  id: string
  course: string
  date: string
  time: string
  location: string
  attended: boolean
}

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("courses")

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const enrolledCourses: EnrolledCourse[] = [
    {
      id: "course_001",
      code: "CS301",
      name: "Advanced Database Systems",
      teacher: "Dr. Ali Mohamed",
      attendance: 95,
      grade: "A",
      progress: 85,
    },
    {
      id: "course_002",
      code: "ENG201",
      name: "Digital Systems Design",
      teacher: "Prof. Fatima Mansour",
      attendance: 88,
      grade: "B+",
      progress: 72,
    },
  ]

  const upcomingLectures: UpcomingLecture[] = [
    {
      id: "lec_001",
      course: "CS301",
      date: "2025-01-15",
      time: "10:00 AM",
      location: "Building A, Room 201",
      attended: true,
    },
    {
      id: "lec_002",
      course: "ENG201",
      date: "2025-01-16",
      time: "2:00 PM",
      location: "Building B, Room 105",
      attended: false,
    },
    {
      id: "lec_003",
      course: "CS301",
      date: "2025-01-22",
      time: "10:00 AM",
      location: "Building A, Room 201",
      attended: false,
    },
  ]

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Portal</h1>
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

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Enrolled Courses</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">2</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Avg Attendance</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">91.5%</p>
                    <p className="text-emerald-600 text-xs mt-2 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Excellent
                    </p>
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
                    <p className="text-gray-600 text-sm">GPA</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">3.92</p>
                    <p className="text-purple-600 text-xs mt-2 flex items-center">
                      <Award className="w-3 h-3 mr-1" />
                      Honors
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Award className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Upcoming Lectures</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">3</p>
                    <p className="text-amber-600 text-xs mt-2 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      This week
                    </p>
                  </div>
                  <div className="bg-amber-100 p-3 rounded-lg">
                    <Calendar className="w-6 h-6 text-amber-600" />
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
              <TabsTrigger value="attendance" className="data-[state=active]:bg-gray-100">
                My Attendance
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="data-[state=active]:bg-gray-100">
                Upcoming Lectures
              </TabsTrigger>
              <TabsTrigger value="materials" className="data-[state=active]:bg-gray-100">
                Course Materials
              </TabsTrigger>
            </TabsList>

            {/* My Courses */}
            <TabsContent value="courses" className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Enrolled Courses</h2>
              <div className="space-y-4">
                {enrolledCourses.map((course) => (
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
                            ></div>
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
                              style={{ width: `${course.attendance}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <Button className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-900">
                        View Course Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* My Attendance */}
            <TabsContent value="attendance" className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance Summary</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900 text-sm">Total Classes Attended</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-4xl font-bold text-emerald-600">67</p>
                      <CheckCircle className="w-12 h-12 text-emerald-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900 text-sm">Classes Missed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-4xl font-bold text-amber-600">6</p>
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
                    {enrolledCourses.map((course) => (
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
                            style={{ width: `${course.attendance}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Download className="w-4 h-4 mr-2" />
                Download Attendance Certificate
              </Button>
            </TabsContent>

            {/* Upcoming Lectures */}
            <TabsContent value="upcoming" className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Lectures</h2>
              <div className="space-y-4">
                {upcomingLectures.map((lecture) => (
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
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm">
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

            {/* Course Materials */}
            <TabsContent value="materials" className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Course Materials</h2>
              <div className="space-y-4">
                {enrolledCourses.map((course) => (
                  <Card key={course.id} className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-gray-900">{course.name}</CardTitle>
                      <CardDescription className="text-gray-600">{course.code}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { name: "Lecture Slides Week 1", type: "PDF" },
                        { name: "Database Design Concepts", type: "Video" },
                        { name: "SQL Query Examples", type: "Code" },
                      ].map((material, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <div>
                              <p className="text-gray-900 text-sm font-medium">{material.name}</p>
                              <p className="text-gray-600 text-xs">{material.type}</p>
                            </div>
                          </div>
                          <Download className="w-4 h-4 text-gray-600 hover:text-gray-900" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </ProtectedRoute>
  )
}
