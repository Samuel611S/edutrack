"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, GraduationCap, Sparkles } from "lucide-react"
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
        credentials: "include",
        body: JSON.stringify({ id, password, role }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Login failed")
        return
      }

      login({
        role: role as "admin" | "teacher" | "student",
        userId: data.userId,
        userName: data.userName,
      })

      const redirectPaths: Record<string, string> = {
        admin: "/admin/dashboard",
        teacher: "/teacher/dashboard",
        student: "/student/dashboard",
      }

      router.push(redirectPaths[role])
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error("[EduTrack] Login error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col edu-dashboard-bg">
      {/* Top bar — same language as dashboard headers */}
      <header className="edu-dashboard-header sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-md shadow-sm shadow-indigo-950/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50/90 shadow-sm shadow-indigo-950/5">
              <GraduationCap className="h-6 w-6 text-indigo-600" strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-libre text-[11px] font-normal uppercase tracking-[0.2em] text-indigo-600/90">
                EduTrack+
              </p>
              <p className="text-base font-semibold text-gray-900">Campus portal</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
            <Sparkles className="h-4 w-4 text-amber-500/90" />
            <span>Attendance &amp; academics</span>
          </div>
        </div>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-10">
        {/* Soft accents — same family as dashboard (light, not dark blobs) */}
        <div
          className="pointer-events-none absolute right-[10%] top-[18%] h-64 w-64 rounded-full bg-indigo-300/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-[12%] left-[8%] h-72 w-72 rounded-full bg-violet-300/15 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10 w-full max-w-md edu-dashboard-enter">
          <div className="mb-8 text-center edu-login-title">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Welcome back
              </span>
            </h1>
            <p className="mt-2 text-sm text-slate-600">Sign in to continue</p>
          </div>

          <div className="edu-login-sub">
            <Card className="edu-login-card border-white/80 bg-white/90 shadow-md shadow-indigo-950/5 backdrop-blur-sm">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl text-gray-900">Sign in</CardTitle>
                <CardDescription className="text-slate-600">Use your university ID and password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-900">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="id" className="text-gray-700">
                      University ID
                    </Label>
                    <Input
                      id="id"
                      type="text"
                      placeholder="Enter your ID"
                      value={id}
                      onChange={(e) => setId(e.target.value)}
                      className="h-11 border-gray-200 bg-gray-50/80 text-gray-900 placeholder:text-gray-400 focus-visible:border-indigo-400 focus-visible:ring-indigo-400/20"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-gray-700">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 border-gray-200 bg-gray-50/80 text-gray-900 placeholder:text-gray-400 focus-visible:border-indigo-400 focus-visible:ring-indigo-400/20"
                      required
                    />
                    <p className="text-xs text-slate-500">Default demo password for all test accounts below</p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 h-11 w-full bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-950/15 transition-all hover:bg-indigo-700 hover:shadow-lg disabled:opacity-60"
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Signing in…
                      </span>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>

                <div className="mt-6 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 mb-3">Quick demo sign-in</p>
                  <p className="text-xs text-slate-600 mb-3">
                    Password: <span className="font-mono font-semibold text-slate-800">12345678</span>
                    <span className="block mt-1 text-[11px] text-slate-500">
                      Demo people &amp; courses use Arabic names written in English (romanization); IDs unchanged.
                    </span>
                  </p>
                  <div className="space-y-2">
                    {[
                      { role: "Admin", id: "02511793", hint: "Full campus access" },
                      { role: "Teacher", id: "12520001", hint: "Faculty roster (bulk seed)" },
                      { role: "Student", id: "22530001", hint: "Student portal" },
                    ].map((row) => (
                      <button
                        key={row.role}
                        type="button"
                        onClick={() => {
                          setId(row.id)
                          setPassword("12345678")
                          setError("")
                        }}
                        className="w-full flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/80 bg-white/90 px-3 py-2.5 text-left text-sm shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50"
                      >
                        <span className="font-medium text-gray-900">{row.role}</span>
                        <span className="font-mono text-xs text-indigo-800">{row.id}</span>
                        <span className="w-full text-[11px] text-slate-500">{row.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="mt-8 text-center text-[11px] text-slate-500">© 2026 EduTrack+</p>
        </div>
      </main>
    </div>
  )
}
