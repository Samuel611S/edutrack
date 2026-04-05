"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { MapPin, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface AttendanceLocation {
  latitude: number
  longitude: number
  accuracy: number
}

interface LectureInfo {
  id: string
  course_name: string
  course_code: string
  start_time: string
  end_time: string
  location: string
  latitude: number
  longitude: number
  allowed_radius_m: number
}

export default function AttendancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [lectureLoading, setLectureLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [location, setLocation] = useState<AttendanceLocation | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [isLocationSupported, setIsLocationSupported] = useState(true)
  const [currentLecture, setCurrentLecture] = useState<LectureInfo | null>(null)

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

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  const getLocation = () => {
    if (!currentLecture) return
    setError("")
    setSuccess("")
    setLoading(true)

    if (!navigator.geolocation) {
      setIsLocationSupported(false)
      setError("Geolocation is not supported by your browser.")
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        const userLocation = { latitude, longitude, accuracy }
        setLocation(userLocation)

        const distanceMeters = calculateDistance(
          latitude,
          longitude,
          currentLecture.latitude,
          currentLecture.longitude,
        )
        setDistance(Math.round(distanceMeters))
        setLoading(false)
      },
      (err) => {
        console.error("[EduTrack] Geolocation error:", err)
        setError("Unable to access your location. Please enable location services.")
        setLoading(false)
      },
    )
  }

  const markAttendance = async () => {
    if (!currentLecture || !location) {
      setError("Location not available")
      return
    }

    if (!distance || distance > currentLecture.allowed_radius_m) {
      setError(
        `You are ${distance ? distance + "m" : "too far"} from the lecture location. Minimum distance required: ${currentLecture.allowed_radius_m}m`,
      )
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lectureId: currentLecture.id,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Failed to mark attendance")
        return
      }

      setSuccess("Attendance marked successfully!")
      setTimeout(() => {
        router.push("/student/dashboard")
      }, 2000)
    } catch (err) {
      console.error("[EduTrack] Attendance error:", err)
      setError("An error occurred while marking attendance")
    } finally {
      setLoading(false)
    }
  }

  const timeLabel =
    currentLecture &&
    [currentLecture.start_time, currentLecture.end_time].filter(Boolean).join(" - ")

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
              <p className="text-gray-600 text-sm">Location-Based Check-In</p>
            </div>
            <Button
              onClick={() => router.push("/student/dashboard")}
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
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

          {currentLecture && (
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
                      <p className="text-gray-600 text-sm">Lecture Time</p>
                      <p className="text-gray-900 font-medium">{timeLabel || "—"}</p>
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
                    <p className="text-gray-600 text-xs mb-1">Allowed Check-In Radius</p>
                    <p className="text-gray-900 font-semibold">
                      {currentLecture.allowed_radius_m}m from lecture location
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200 shadow-sm mb-6">
                <CardHeader>
                  <CardTitle className="text-gray-900">Location Verification</CardTitle>
                  <CardDescription className="text-gray-600">Enable location services to mark attendance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  {!isLocationSupported && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-amber-700 text-sm">
                        Your browser does not support geolocation. Please use a modern browser.
                      </p>
                    </div>
                  )}

                  {location && (
                    <div className="space-y-3">
                      <div className="bg-gray-100 p-3 rounded">
                        <p className="text-gray-600 text-xs">Your Current Location</p>
                        <p className="text-gray-900 font-mono text-sm mt-1">
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">Accuracy: ±{location.accuracy.toFixed(0)}m</p>
                      </div>

                      {distance !== null && (
                        <div
                          className={`p-3 rounded ${
                            distance <= currentLecture.allowed_radius_m
                              ? "bg-emerald-50 border border-emerald-200"
                              : "bg-red-50 border border-red-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin
                              className={`w-4 h-4 ${
                                distance <= currentLecture.allowed_radius_m ? "text-emerald-600" : "text-red-600"
                              }`}
                            />
                            <p className="text-gray-600 text-xs">Distance from Lecture Location</p>
                          </div>
                          <p
                            className={`font-semibold text-lg ${
                              distance <= currentLecture.allowed_radius_m ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {distance}m
                          </p>
                          {distance <= currentLecture.allowed_radius_m ? (
                            <p className="text-emerald-700 text-xs mt-1">You are within the allowed radius</p>
                          ) : (
                            <p className="text-red-700 text-xs mt-1">
                              You are {distance - currentLecture.allowed_radius_m}m outside the allowed radius
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!location ? (
                    <Button
                      onClick={getLocation}
                      disabled={loading || !isLocationSupported}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Getting Location...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4 mr-2" />
                          Get My Location
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={getLocation}
                      disabled={loading}
                      variant="outline"
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Refreshing...
                        </>
                      ) : (
                        "Refresh Location"
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Button
                onClick={markAttendance}
                disabled={
                  loading ||
                  !location ||
                  distance === null ||
                  distance > currentLecture.allowed_radius_m
                }
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed text-lg py-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Marking Attendance...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Mark Attendance
                  </>
                )}
              </Button>

              <Card className="bg-white border-gray-200 shadow-sm mt-6">
                <CardHeader>
                  <CardTitle className="text-gray-900 text-sm">How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-600">
                  <p>1. Click &quot;Get My Location&quot; to retrieve your GPS coordinates</p>
                  <p>2. The app checks distance from the lecture coordinates (same check is repeated on the server)</p>
                  <p>3. If you are within the allowed radius, you can mark attendance</p>
                  <p>4. Your attendance is stored in the database</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  )
}
