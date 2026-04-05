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
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center p-4">
      {/* Animated atmosphere */}
      <div className="absolute inset-0 bg-[#0b1020]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-10%,rgba(99,102,241,0.35),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_0%_100%,rgba(56,189,248,0.2),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_100%_80%,rgba(192,132,252,0.18),transparent_45%)]" />

      <div
        className="pointer-events-none absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-indigo-500/25 blur-[100px] edu-login-blob-1"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-20 h-[32rem] w-[32rem] rounded-full bg-fuchsia-500/20 blur-[110px] edu-login-blob-2"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[90px] edu-login-blob-3"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8 edu-login-title">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_0_40px_-12px_rgba(99,102,241,0.6)] backdrop-blur-md transition-transform duration-300 hover:scale-[1.03]">
            <GraduationCap className="h-8 w-8 text-indigo-200" strokeWidth={1.5} />
          </div>
          <p className="font-libre text-xs font-normal uppercase tracking-[0.35em] text-slate-400 mb-2">EduTrack+</p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-[2.35rem]">
            <span className="bg-gradient-to-r from-sky-200 via-indigo-200 to-violet-200 bg-clip-text text-transparent">
              Smart Campus
            </span>
          </h1>
          <p className="mt-3 text-slate-400 text-sm flex items-center justify-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-300/90" />
            Attendance &amp; academic management
          </p>
        </div>

        <div className="edu-login-sub">
          <Card className="edu-login-card border-white/10 bg-white/[0.07] shadow-2xl shadow-indigo-950/40 backdrop-blur-xl">
            <CardHeader className="pb-4 space-y-1">
              <CardTitle className="text-xl text-white">Sign in</CardTitle>
              <CardDescription className="text-slate-400">Use your university ID and password</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert
                  variant="destructive"
                  className="mb-4 border-red-400/30 bg-red-500/10 text-red-100 [&>svg]:text-red-300"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="id" className="text-slate-200">
                    University ID
                  </Label>
                  <Input
                    id="id"
                    type="text"
                    placeholder="e.g. 22511793"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className="h-11 border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-indigo-400/60 focus-visible:ring-indigo-400/25 transition-shadow duration-200"
                    required
                  />
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Admin 02… · Teacher 12… · Student 22…
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-slate-200">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-indigo-400/60 focus-visible:ring-indigo-400/25 transition-shadow duration-200"
                    required
                  />
                  <p className="text-[11px] text-slate-500">Demo password shown in course materials: 12345678</p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="edu-login-btn-shimmer mt-2 h-11 w-full border-0 text-white font-semibold shadow-lg shadow-indigo-900/40 transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in…
                    </span>
                  ) : (
                    "Enter dashboard"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-8 edu-login-sub">
          © 2026 EduTrack+
        </p>
      </div>
    </main>
  )
}
