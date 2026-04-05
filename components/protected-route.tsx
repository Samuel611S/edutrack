"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { GraduationCap } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ("admin" | "teacher" | "student")[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login")
      } else if (allowedRoles && !allowedRoles.includes(user?.role as "admin" | "teacher" | "student")) {
        router.push("/login")
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0c1222] text-slate-300">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-[0_0_32px_-8px_rgba(99,102,241,0.45)]">
          <GraduationCap className="h-7 w-7 text-indigo-300 animate-pulse" strokeWidth={1.5} />
        </div>
        <p className="text-sm text-slate-500">Verifying your session…</p>
        <div className="flex gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 edu-dot-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 edu-dot-pulse" style={{ animationDelay: "120ms" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 edu-dot-pulse" style={{ animationDelay: "240ms" }} />
        </div>
      </div>
    )
  }

  if (!isAuthenticated || (allowedRoles && !allowedRoles.includes(user?.role as "admin" | "teacher" | "student"))) {
    return null
  }

  return <>{children}</>
}
