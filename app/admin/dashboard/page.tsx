"use client"

import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BookOpen, BarChart3, LogOut, Settings, FileText, TrendingUp, Clock } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
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

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Students</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">2,847</p>
                    <p className="text-emerald-600 text-xs mt-2 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +12% this month
                    </p>
                  </div>
                  <div className="bg-emerald-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Active Teachers</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">156</p>
                    <p className="text-blue-600 text-xs mt-2 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      All active
                    </p>
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
                    <p className="text-3xl font-bold text-gray-900 mt-1">87.5%</p>
                    <p className="text-amber-600 text-xs mt-2 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Last 30 days
                    </p>
                  </div>
                  <div className="bg-amber-100 p-3 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Active Courses</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">48</p>
                    <p className="text-purple-600 text-xs mt-2 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Spring 2025
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white border-gray-200 hover:border-gray-300 shadow-sm transition cursor-pointer">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900">Manage Students</CardTitle>
                    <CardDescription className="text-gray-600">Add, edit, and manage student accounts</CardDescription>
                  </div>
                  <Users className="w-8 h-8 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">Go to Students</Button>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 hover:border-gray-300 shadow-sm transition cursor-pointer">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900">Manage Teachers</CardTitle>
                    <CardDescription className="text-gray-600">Add, edit, and manage teacher accounts</CardDescription>
                  </div>
                  <BookOpen className="w-8 h-8 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Go to Teachers</Button>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 hover:border-gray-300 shadow-sm transition cursor-pointer">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900">Attendance Reports</CardTitle>
                    <CardDescription className="text-gray-600">View and export attendance records</CardDescription>
                  </div>
                  <BarChart3 className="w-8 h-8 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">View Reports</Button>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 hover:border-gray-300 shadow-sm transition cursor-pointer">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900">Manage Courses</CardTitle>
                    <CardDescription className="text-gray-600">Add and configure courses and schedules</CardDescription>
                  </div>
                  <FileText className="w-8 h-8 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">Go to Courses</Button>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 hover:border-gray-300 shadow-sm transition cursor-pointer">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900">Location Settings</CardTitle>
                    <CardDescription className="text-gray-600">
                      Configure campus locations and GPS zones
                    </CardDescription>
                  </div>
                  <Users className="w-8 h-8 text-pink-600" />
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white">Configure Locations</Button>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 hover:border-gray-300 shadow-sm transition cursor-pointer">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900">System Settings</CardTitle>
                    <CardDescription className="text-gray-600">
                      Manage system configuration and preferences
                    </CardDescription>
                  </div>
                  <Settings className="w-8 h-8 text-cyan-600" />
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">Go to Settings</Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Recent Activity</CardTitle>
              <CardDescription className="text-gray-600">Latest system updates and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    type: "Student Registration",
                    description: "New student registered: Ahmed Al-Mansouri",
                    time: "2 hours ago",
                  },
                  {
                    type: "Attendance Marked",
                    description: "342 students marked attendance in CS301 lecture",
                    time: "5 hours ago",
                  },
                  {
                    type: "Course Created",
                    description: "New course: Advanced Algorithms (ENG401)",
                    time: "1 day ago",
                  },
                  {
                    type: "System Update",
                    description: "Location verification radius updated to 100m",
                    time: "2 days ago",
                  },
                ].map((activity, idx) => (
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
        </div>
      </main>
    </ProtectedRoute>
  )
}
