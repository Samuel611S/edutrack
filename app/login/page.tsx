"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [id, setId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const getRoleFromId = (idValue: string): string => {
    if (idValue.startsWith("02")) return "admin"
    if (idValue.startsWith("12")) return "teacher"
    if (idValue.startsWith("22")) return "student"
    return ""
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const role = getRoleFromId(id)
      if (!role) {
        setError("Invalid ID format. Admin: 02XXXXXX, Teacher: 12XXXXXX, Student: 22XXXXXX")
        setIsLoading(false)
        return
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password, role }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Login failed")
        return
      }

      // Store session info via auth context
      login({
        token: data.token,
        role,
        userId: data.userId,
        userName: data.userName,
      })

      // Redirect based on role
      const redirectPaths: Record<string, string> = {
        admin: "/admin/dashboard",
        teacher: "/teacher/dashboard",
        student: "/student/dashboard",
      }

      router.push(redirectPaths[role])
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error("[v0] Login error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            EduTrack+
          </h1>
          <p className="text-gray-600 text-lg font-medium">Smart Attendance Management</p>
          <p className="text-gray-500 text-sm mt-1">Track attendance with precision</p>
        </div>

        {/* Login Card */}
        <Card className="border-gray-200 bg-white shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl text-gray-900">Sign In</CardTitle>
            <CardDescription className="text-gray-600">Enter your ID and password</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200 mb-4">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="id" className="text-gray-700 font-medium">
                  ID
                </Label>
                <Input
                  id="id"
                  type="text"
                  placeholder="Enter your ID"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Admin: 02511793 | Teacher: 12511793 | Student: 22511793</p>
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Password: 12345678</p>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-gray-500 text-xs text-center mt-6">© 2025 EduTrack+. All rights reserved.</p>
      </div>
    </main>
  )
}


