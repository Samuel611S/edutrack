"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function AdminReportsPage() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/reports/attendance", { credentials: "include" })
      const j = await res.json()
      if (res.ok) setCount(j.count ?? 0)
      setLoading(false)
    })()
  }, [])

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Attendance reports</h1>
            <Button variant="outline" asChild>
              <Link href="/admin/dashboard">Back to dashboard</Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System-wide attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                {loading ? "Loading…" : `${count} attendance row(s) in the database.`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <a href="/api/admin/reports/attendance?format=csv" target="_blank" rel="noreferrer">
                    Download CSV
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/api/admin/reports/attendance" target="_blank" rel="noreferrer">
                    View JSON
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </ProtectedRoute>
  )
}
