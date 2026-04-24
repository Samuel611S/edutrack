"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MapPin, Clock, CheckCircle, AlertCircle, Loader2, Radio } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatDurationMs, parseLectureBounds } from "@/lib/lecture-window"
import { formatTimeAmPm } from "@/lib/time-format"
import { getSectionPolygonByKey, lectureLocationToSectionKey, pointInPolygon } from "@/lib/campus-sections"

const POLL_MS = 15_000
const MAX_OUTSIDE_SEC = 600

interface LectureInfo {
  id: string
  course_name: string
  course_code: string
  lecture_date: string
  start_time: string
  end_time: string
  location: string
  latitude: number
  longitude: number
  allowed_radius_m: number
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function AttendancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [lectureLoading, setLectureLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLocationSupported, setIsLocationSupported] = useState(true)
  const [currentLecture, setCurrentLecture] = useState<LectureInfo | null>(null)

  const [tracking, setTracking] = useState(false)
  const [outsideSec, setOutsideSec] = useState(0)
  const [lastDistance, setLastDistance] = useState<number | null>(null)
  const [isInside, setIsInside] = useState<boolean | null>(null)
  const [tick, setTick] = useState(0)
  const [checkedIn, setCheckedIn] = useState(false)

  const trackingRef = useRef(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSampleAtRef = useRef<number | null>(null)
  const lastWasOutsideRef = useRef(false)
  const outsideSecRef = useRef(0)
  const pollInFlightRef = useRef(false)

  const bounds = useMemo(() => {
    if (!currentLecture?.lecture_date) return null
    return parseLectureBounds(currentLecture.lecture_date, currentLecture.start_time, currentLecture.end_time)
  }, [currentLecture])

  useEffect(() => {
    trackingRef.current = tracking
  }, [tracking])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setIsLocationSupported(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/student/lectures/current", { credentials: "include" })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || !data.lecture) {
          setError(data.message || "No lecture available for your enrollments.")
          setCurrentLecture(null)
        } else {
          const L = data.lecture
          setCurrentLecture({
            id: L.id,
            course_name: L.course_name,
            course_code: L.course_code,
            lecture_date: String(L.lecture_date ?? ""),
            start_time: L.start_time || "",
            end_time: L.end_time || "",
            location: L.location || "",
            latitude: Number(L.latitude),
            longitude: Number(L.longitude),
            allowed_radius_m: Number(L.allowed_radius_m ?? 100),
          })
        }
      } catch {
        if (!cancelled) setError("Could not load lecture.")
      } finally {
        if (!cancelled) setLectureLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const nowMs = Date.now()
  const phase =
    bounds && Number.isFinite(bounds.startMs)
      ? nowMs < bounds.startMs
        ? "before"
        : nowMs <= bounds.endMs
          ? "during"
          : "after"
      : "unknown"

  useEffect(() => {
    if (!currentLecture || !bounds || !Number.isFinite(bounds.startMs)) return
    const shouldTrack = checkedIn && phase === "during"
    if (shouldTrack && !trackingRef.current) {
      lastSampleAtRef.current = null
      lastWasOutsideRef.current = false
      outsideSecRef.current = 0
      setOutsideSec(0)
      setLastDistance(null)
      setIsInside(null)
      setTracking(true)
      setError("")
      setSuccess("")
    } else if (!shouldTrack && trackingRef.current) {
      setTracking(false)
      trackingRef.current = false
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [phase, currentLecture, bounds, checkedIn])

  const processPosition = useCallback(
    (latitude: number, longitude: number) => {
      if (!currentLecture || !bounds || !Number.isFinite(bounds.startMs)) return

      const at = Date.now()
      const radius = currentLecture.allowed_radius_m
      const d = haversineMeters(latitude, longitude, currentLecture.latitude, currentLecture.longitude)
      const outside = d > radius

      if (lastSampleAtRef.current != null) {
        const segStart = Math.max(lastSampleAtRef.current, bounds.startMs)
        const segEnd = Math.min(at, bounds.endMs)
        if (segEnd > segStart && lastWasOutsideRef.current) {
          outsideSecRef.current += (segEnd - segStart) / 1000
        }
      }

      lastSampleAtRef.current = at
      lastWasOutsideRef.current = outside

      const rounded = Math.round(outsideSecRef.current * 10) / 10
      setOutsideSec(rounded)
      setLastDistance(Math.round(d))
      setIsInside(!outside)
    },
    [currentLecture, bounds],
  )

  const runPoll = useCallback(() => {
    if (!trackingRef.current || !currentLecture || pollInFlightRef.current) return
    if (!navigator.geolocation) return

    pollInFlightRef.current = true
    navigator.geolocation.getCurrentPosition(
      (position) => {
        pollInFlightRef.current = false
        const { latitude, longitude } = position.coords
        processPosition(latitude, longitude)
        if (checkedIn && currentLecture) {
          void fetch("/api/attendance/mark", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              mode: "track",
              lectureId: currentLecture.id,
              latitude,
              longitude,
              outsideRadiusSeconds: Math.round(outsideSecRef.current),
            }),
          }).catch(() => {})
        }
      },
      () => {
        pollInFlightRef.current = false
      },
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 12_000 },
    )
  }, [currentLecture, processPosition, checkedIn])

  useEffect(() => {
    if (!tracking || !currentLecture) return

    runPoll()
    pollRef.current = setInterval(() => {
      runPoll()
      if (bounds && Date.now() > bounds.endMs + 120_000) {
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = null
        trackingRef.current = false
        setTracking(false)
      }
    }, POLL_MS)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [tracking, currentLecture, bounds, runPoll])

  const checkIn = async () => {
    if (!currentLecture || !bounds || !Number.isFinite(bounds.startMs)) {
      setError("Lecture schedule is not available.")
      return
    }

    const now = Date.now()
    if (now < bounds.startMs) {
      setError("Check-in is only available during the lecture. The lecture has not started yet.")
      return
    }
    if (now > bounds.endMs) {
      setError("Check-in is only available during the lecture. The lecture has already ended.")
      return
    }

    setLoading(true)
    setError("")

    if (!navigator.geolocation) {
      setError("Geolocation is not supported.")
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const d = haversineMeters(
          latitude,
          longitude,
          currentLecture.latitude,
          currentLecture.longitude,
        )

        if (d > currentLecture.allowed_radius_m) {
          setError(
            `Submit while inside the lecture area (within ${currentLecture.allowed_radius_m} m). You are about ${Math.round(d)} m away.`,
          )
          setLoading(false)
          return
        }

        const sectionKey = lectureLocationToSectionKey(currentLecture.location) ?? "building"
        const sectionPoly = getSectionPolygonByKey(sectionKey)
        if (!sectionPoly || !pointInPolygon(latitude, longitude, sectionPoly)) {
          setError(`You must be inside the required section (${currentLecture.location || sectionKey}) to check in.`)
          setLoading(false)
          return
        }

        try {
          const response = await fetch("/api/attendance/mark", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              lectureId: currentLecture.id,
              latitude,
              longitude,
                mode: "checkin",
            }),
          })

          const data = await response.json()

          if (!response.ok) {
            setError(data.message || "Failed to mark attendance")
            setLoading(false)
            return
          }

          setSuccess("Check-in successful. Tracking will run automatically during lecture.")
          setCheckedIn(true)
        } catch {
          setError("An error occurred while checking in")
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError("Unable to read your location for final verification. Enable GPS and try again.")
        setLoading(false)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15_000 },
    )
  }

  const timeLabel =
    currentLecture &&
    [formatTimeAmPm(currentLecture.start_time), formatTimeAmPm(currentLecture.end_time)].filter((s) => s && s !== "—").join(" – ")

  const durationLabel = bounds ? formatDurationMs(bounds.durationMs) : "—"
  const outsideOver = outsideSec > MAX_OUTSIDE_SEC

  void tick

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Mark Attendance</h1>
            </div>
            <Button
              onClick={() => router.push("/student/dashboard")}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Back
            </Button>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 py-8">
          {lectureLoading && (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading lecture…
            </div>
          )}

          {!lectureLoading && !currentLecture && (
            <Card className="border-amber-200 bg-amber-50 mb-6">
              <CardContent className="pt-6 text-amber-900 text-sm">{error || "No lecture found."}</CardContent>
            </Card>
          )}

          {currentLecture && bounds && !Number.isFinite(bounds.startMs) && (
            <Card className="border-red-200 bg-red-50 mb-6">
              <CardContent className="pt-6 text-red-800 text-sm">
                This lecture has an invalid date or time in the system.
              </CardContent>
            </Card>
          )}

          {currentLecture && bounds && Number.isFinite(bounds.startMs) && (
            <>
              <Card className="bg-white border-gray-200 shadow-sm mb-6">
                <CardHeader>
                  <CardTitle className="text-gray-900">{currentLecture.course_name}</CardTitle>
                  <CardDescription className="text-gray-600">{currentLecture.course_code}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-gray-600 text-sm">Lecture time</p>
                      <p className="text-gray-900 font-medium">{timeLabel || "—"}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{durationLabel}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-pink-600" />
                    <div>
                      <p className="text-gray-600 text-sm">Location</p>
                      <p className="text-gray-900 font-medium">{currentLecture.location}</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-gray-600 text-xs mb-1">Allowed radius</p>
                    <p className="text-gray-900 font-semibold">{currentLecture.allowed_radius_m} m from lecture GPS</p>
                  </div>

                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2">
                    {phase === "before" && "Before lecture"}
                    {phase === "during" && "Lecture in progress"}
                    {phase === "after" && "Lecture ended"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200 shadow-sm mb-6">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Radio className="w-5 h-5 text-indigo-600" />
                    Lecture location tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isLocationSupported && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-amber-700 text-sm">Your browser does not support geolocation.</p>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded p-4 flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <p className="text-emerald-700 text-sm">{success}</p>
                    </div>
                  )}

                  {!checkedIn && (
                    <Button
                      type="button"
                      className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={checkIn}
                      disabled={loading || phase !== "during"}
                    >
                      Check in
                    </Button>
                  )}

                  {tracking && checkedIn && (
                    <p className="text-sm text-indigo-700 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
                      </span>
                      Live
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Time outside radius</span>
                      <span className={outsideOver ? "font-bold text-red-600" : "font-semibold text-gray-900"}>
                        {Math.floor(outsideSec / 60)}m {Math.round(outsideSec % 60)}s
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${outsideOver ? "bg-red-500" : "bg-indigo-500"}`}
                        style={{ width: `${Math.min(100, (outsideSec / MAX_OUTSIDE_SEC) * 100)}%` }}
                      />
                    </div>
                    {outsideOver && <p className="text-sm text-red-600 font-medium">Teacher confirmation required.</p>}
                  </div>

                  {lastDistance != null && (
                    <div
                      className={`p-3 rounded text-sm ${
                        isInside ? "bg-emerald-50 border border-emerald-200 text-emerald-900" : "bg-red-50 border border-red-200 text-red-900"
                      }`}
                    >
                      {lastDistance} m - {isInside ? "inside area" : "outside area"}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                onClick={() => router.push("/student/dashboard")}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed text-lg py-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Back to dashboard
                  </>
                )}
              </Button>

            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  )
}
