"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

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
      } else if (allowedRoles && !allowedRoles.includes(user?.role as any)) {
        router.push("/login")
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated || (allowedRoles && !allowedRoles.includes(user?.role as any))) {
    return null
  }

  return <>{children}</>
}
