"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type RegistrationData = {
  maxStandardCredits: number
  pricePerCredit: number
  enrolled: {
    enrollment_id: string
    id: string
    course_code: string
    course_name: string
    semester: string
    credits: number
    teacher_name: string
  }[]
  available: {
    id: string
    course_code: string
    course_name: string
    semester: string
    credits: number
    teacher_name: string
  }[]
  requests: {
    id: string
    batch_id: string | null
    request_type: "add" | "drop"
    status: "pending" | "approved" | "rejected"
    is_overload: number
    reason: string | null
    created_at: string
    course_id: string
    course_code: string
    course_name: string
    semester: string
  }[]
  payment: { semester: string; totalCredits: number; amount: number }
}

export default function StudentRegistrationPage() {
  const [data, setData] = useState<RegistrationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState("")
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [extraReason, setExtraReason] = useState("")

  const load = async () => {
    const res = await fetch("/api/student/registration", { credentials: "include" })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message || "Failed to load registration")
    setData(json)
  }

  useEffect(() => {
    ;(async () => {
      try {
        await load()
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Failed to load")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const enrolledIds = useMemo(() => new Set((data?.enrolled || []).map((e) => e.id)), [data])
  const hasPendingBatch = useMemo(() => (data?.requests || []).some((r) => r.status === "pending"), [data])
  const selectedCredits = useMemo(() => {
    if (!data) return 0
    const selected = new Set(selectedCourses)
    return data.available
      .filter((c) => selected.has(c.id))
      .reduce((sum, c) => sum + Number(c.credits || 0), 0)
  }, [data, selectedCourses])
  const projectedCredits = (data?.payment.totalCredits || 0) + selectedCredits
  const isOverload = data ? projectedCredits > data.maxStandardCredits : false
  const filteredAvailable = useMemo(() => {
    if (!data) return []
    if (!searchQuery.trim()) return data.available
    const q = searchQuery.toLowerCase()
    return data.available.filter(
      (c) =>
        c.course_code.toLowerCase().includes(q) ||
        c.course_name.toLowerCase().includes(q) ||
        c.teacher_name.toLowerCase().includes(q),
    )
  }, [data, searchQuery])

  const submitBatchRequest = async () => {
    setMsg("")
    if (selectedCourses.length === 0) {
      setMsg("Select at least one course")
      return
    }
    const res = await fetch("/api/student/registration", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseIds: selectedCourses, reason: extraReason }),
    })
    const json = await res.json()
    if (!res.ok) {
      setMsg(json.message || "Request failed")
      return
    }
    setMsg("Request submitted.")
    setSelectedCourses([])
    setExtraReason("")
    await load()
  }

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <main className="min-h-screen edu-dashboard-bg">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Course Registration</h1>
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
              <Link href="/student/payment">Continue to payment</Link>
            </Button>
          </div>
          {msg && <p className="text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-3 py-2">{msg}</p>}
          {loading && <p className="text-sm text-slate-600">Loading…</p>}

          {data && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Current semester summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Semester</p>
                    <p className="font-semibold">{data.payment.semester}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Approved credits</p>
                    <p className="font-semibold">{data.payment.totalCredits}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Estimated payment</p>
                    <p className="font-semibold">
                      {data.payment.totalCredits} x {data.pricePerCredit.toLocaleString()} ={" "}
                      {data.payment.amount.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Course Selection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search by course code, name, or instructor"
                    />
                    <Button type="button" variant="outline" onClick={() => setSearchQuery(searchInput)}>
                      Search
                    </Button>
                  </div>

                  {filteredAvailable.map((c) => {
                    const isEnrolled = enrolledIds.has(c.id)
                    const checked = selectedCourses.includes(c.id)
                    return (
                      <div key={c.id} className="border rounded p-3 space-y-2">
                        <label className="font-medium flex items-center gap-2">
                          {!isEnrolled && (
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={hasPendingBatch}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedCourses((prev) => [...prev, c.id])
                                else setSelectedCourses((prev) => prev.filter((id) => id !== c.id))
                              }}
                            />
                          )}
                          {c.course_code} - {c.course_name}
                        </label>
                        <p className="text-xs text-slate-600">
                          {c.semester} | {c.credits} credits | Teacher: {c.teacher_name}
                        </p>
                        {isEnrolled && <p className="text-xs text-emerald-700">Already approved/enrolled</p>}
                      </div>
                    )
                  })}
                  {filteredAvailable.length === 0 && (
                    <p className="text-sm text-slate-500">No matching courses.</p>
                  )}
                  <div className="rounded border bg-slate-50 px-3 py-3 space-y-2">
                    <p className="text-sm">
                      Selected credits: <strong>{selectedCredits}</strong>
                    </p>
                    <p className="text-sm">
                      Projected semester credits: <strong>{projectedCredits}</strong> / {data.maxStandardCredits}
                    </p>
                    {isOverload && (
                      <>
                        <Label htmlFor="extra-reason">Overload reason</Label>
                        <Input
                          id="extra-reason"
                          value={extraReason}
                          onChange={(e) => setExtraReason(e.target.value)}
                          placeholder="Provide a reason"
                        />
                      </>
                    )}
                    <Button
                      onClick={() => void submitBatchRequest()}
                      disabled={hasPendingBatch}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Submit request
                    </Button>
                    {hasPendingBatch && <p className="text-xs text-amber-700">Pending request exists.</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>My Requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {data.requests.length === 0 && <p className="text-slate-500">No requests yet.</p>}
                  {data.requests.map((r) => (
                    <div key={r.id} className="border rounded px-3 py-2">
                      <p>
                        {r.course_code} - {r.course_name} | {r.request_type.toUpperCase()} |{" "}
                        <span className="font-semibold">{r.status.toUpperCase()}</span>
                      </p>
                      {r.is_overload === 1 && <p className="text-xs text-amber-700">Overload request</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  )
}
