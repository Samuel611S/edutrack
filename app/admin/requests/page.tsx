"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { AdminPageShell } from "@/components/admin-page-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type RequestRow = {
  id: string
  batch_id: string | null
  request_type: "add" | "drop"
  status: "pending" | "approved" | "rejected"
  is_overload: number
  reason: string | null
  student_name: string
  student_code: string
  course_code: string
  course_name: string
  semester: string
  reviewed_by_name: string | null
  reviewed_by_role: string | null
}

export default function AdminRequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState("")

  const load = async () => {
    const res = await fetch("/api/admin/requests", { credentials: "include" })
    const json = await res.json()
    if (!res.ok) {
      setMsg(json.message || "Failed to load requests")
      return
    }
    setRows(json.requests || [])
  }

  useEffect(() => {
    ;(async () => {
      try {
        await load()
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const processRequest = async (id: string, action: "approve" | "reject") => {
    setMsg("")
    const res = await fetch(`/api/admin/requests/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    const json = await res.json()
    if (!res.ok) {
      setMsg(json.message || "Action failed")
      return
    }
    await load()
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminPageShell title="Course Requests" subtitle="Approve or reject student add/drop and extra course requests">
        {msg && <p className="text-sm text-indigo-700 mb-3">{msg}</p>}
        {loading && <p className="text-sm text-slate-600">Loading…</p>}
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {r.course_code} - {r.course_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  Student: {r.student_name} ({r.student_code}) | {r.semester}
                </p>
                {r.batch_id && <p>Batch: {r.batch_id}</p>}
                <p>
                  Request: {r.request_type.toUpperCase()} | Status: <strong>{r.status.toUpperCase()}</strong>
                </p>
                {r.is_overload === 1 && <p className="text-amber-700">Extra course request (over 4 courses)</p>}
                {r.reason && <p>Reason: {r.reason}</p>}
                {r.reviewed_by_name && <p>Reviewed by: {r.reviewed_by_name} ({r.reviewed_by_role || "teacher"})</p>}
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void processRequest(r.id, "approve")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void processRequest(r.id, "reject")}>
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {!loading && rows.length === 0 && <p className="text-sm text-slate-500">No requests yet.</p>}
        </div>
      </AdminPageShell>
    </ProtectedRoute>
  )
}
