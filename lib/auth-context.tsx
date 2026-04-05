"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { WelcomeSplash } from "@/components/welcome-splash"

interface User {
  id: string
  name: string
  role: "admin" | "teacher" | "student"
  email: string
}

type SplashPhase = "splash" | "exit" | "done"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (params: { role: "admin" | "teacher" | "student"; userId: string; userName: string }) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MIN_SPLASH_MS = 1400
const EXIT_ANIM_MS = 520

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [splashPhase, setSplashPhase] = useState<SplashPhase>("splash")

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      let authResult: { authenticated: boolean; user?: { id: string; name: string; role: User["role"] } } = {
        authenticated: false,
      }

      await Promise.all([
        new Promise<void>((resolve) => setTimeout(resolve, MIN_SPLASH_MS)),
        (async () => {
          try {
            const res = await fetch("/api/auth/me", { credentials: "include" })
            authResult = await res.json()
          } catch {
            authResult = { authenticated: false }
          }
        })(),
      ])

      if (cancelled) return

      if (authResult.authenticated && authResult.user) {
        setUser({
          id: authResult.user.id,
          name: authResult.user.name,
          role: authResult.user.role,
          email: "",
        })
      } else {
        setUser(null)
      }

      setSplashPhase("exit")
      await new Promise((r) => setTimeout(r, EXIT_ANIM_MS))
      if (!cancelled) setSplashPhase("done")
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const login: AuthContextType["login"] = ({ role, userId, userName }) => {
    setUser({
      id: userId,
      name: userName,
      role,
      email: "",
    })
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } finally {
      setUser(null)
    }
  }

  const isLoading = splashPhase !== "done"
  const showSplashOverlay = splashPhase === "splash" || splashPhase === "exit"

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      <div className={showSplashOverlay ? "min-h-screen" : undefined} aria-busy={showSplashOverlay}>
        {children}
      </div>
      {showSplashOverlay && <WelcomeSplash phase={splashPhase === "exit" ? "exit" : "splash"} />}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
