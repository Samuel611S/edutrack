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
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("authToken")
    const userRole = localStorage.getItem("userRole")
    const userId = localStorage.getItem("userId")
    const userName = localStorage.getItem("userName")

    if (token && userRole && userId && userName) {
      setUser({
        id: userId,
        name: userName,
        role: userRole as "admin" | "teacher" | "student",
        email: "", // Could be retrieved from token
      })
    }

    setIsLoading(false)
  }, [])

  const logout = () => {
    localStorage.removeItem("authToken")
    localStorage.removeItem("userRole")
    localStorage.removeItem("userId")
    localStorage.removeItem("userName")
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
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
