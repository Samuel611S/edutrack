"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: string
  name: string
  role: "admin" | "teacher" | "student"
  email: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (params: { token: string; role: "admin" | "teacher" | "student"; userId: string; userName: string }) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Always require login on a fresh visit/refresh (no persisted auth).
    // Also clear any old persisted data so it can't "remember" previous users.
    localStorage.removeItem("authToken")
    localStorage.removeItem("userRole")
    localStorage.removeItem("userId")
    localStorage.removeItem("userName")

    setIsLoading(false)
  }, [])

  const login: AuthContextType["login"] = ({ token, role, userId, userName }) => {
    // Intentionally NOT persisted: we keep auth in-memory only for this session/runtime.
    setUser({
      id: userId,
      name: userName,
      role,
      email: "",
    })
  }

  const logout = () => {
    setUser(null)
  }

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
      {children}
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
