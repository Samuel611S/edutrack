"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState, useRef, useCallback } from "react"
import { CheckCircle, AlertCircle, Loader2, Navigation } from "lucide-react"
import { useRouter } from "next/navigation"
import { FaceAuthentication } from "@/components/face-authentication"

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
  lectureLatitude: number
  lectureLongitude: number
  allowedRadius: number
  building: string
  roomNumber: string
  section: string
}

declare global {
  interface Window {
    google: any
  }
}

export default function AttendanceMapPage() {
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [lectureLoading, setLectureLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [location, setLocation] = useState<AttendanceLocation | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapKeyMissing, setMapKeyMissing] = useState(false)
  const [showFaceAuth, setShowFaceAuth] = useState(false)
  const [faceAuthType, setFaceAuthType] = useState<"start" | "end">("start")
  const [startFaceDone, setStartFaceDone] = useState(false)
  const [endFaceDone, setEndFaceDone] = useState(false)
  const [timeInSection, setTimeInSection] = useState(0)
  const [checkInTime, setCheckInTime] = useState<Date | null>(null)
  const [currentLecture, setCurrentLecture] = useState<LectureInfo | null>(null)

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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/student/lectures/current", { credentials: "include" })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || !data.lecture) {
          setError(data.message || "No lecture available.")
          setCurrentLecture(null)
        } else {
          const L = data.lecture
          const loc = String(L.location || "")
          const roomMatch = loc.match(/Room\s*(\d+)/i)
          const bldgMatch = loc.match(/Building\s*([A-Z0-9]+)/i)
          setCurrentLecture({
            id: L.id,
            course_name: L.course_name,
            course_code: L.course_code,
            start_time: L.start_time || "",
            end_time: L.end_time || "",
            location: loc,
            lectureLatitude: Number(L.latitude),
            lectureLongitude: Number(L.longitude),
            allowedRadius: Number(L.allowed_radius_m ?? 100),
            building: bldgMatch ? `Building ${bldgMatch[1]}` : "Campus",
            roomNumber: roomMatch ? roomMatch[1] : "—",
            section: "Section A",
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

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key) {
      setMapKeyMissing(true)
      return
    }
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}`
    script.async = true
    script.defer = true
    script.onload = () => setMapLoaded(true)
    document.head.appendChild(script)

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || map || !currentLecture || mapKeyMissing) return
    const centerLat = currentLecture.lectureLatitude
    const centerLng = currentLecture.lectureLongitude

    const googleMap = new window.google.maps.Map(mapRef.current, {
      zoom: 16,
      center: { lat: centerLat, lng: centerLng },
      mapTypeControl: true,
      streetViewControl: true,
    })

    new window.google.maps.Marker({
      position: { lat: centerLat, lng: centerLng },
      map: googleMap,
      title: currentLecture.location,
      icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    })

    new window.google.maps.Circle({
      center: { lat: centerLat, lng: centerLng },
      map: googleMap,
      radius: currentLecture.allowedRadius,
      fillColor: "#3b82f6",
      fillOpacity: 0.12,
      strokeColor: "#2563eb",
      strokeOpacity: 0.5,
      strokeWeight: 1,
    })

    setMap(googleMap)
  }, [mapLoaded, map, currentLecture, mapKeyMissing])

  useEffect(() => {
    if (!checkInTime) return

    const timer = setInterval(() => {
      const elapsed = Math.floor((new Date().getTime() - checkInTime.getTime()) / 1000)
      setTimeInSection(elapsed)
    }, 1000)

    return () => clearInterval(timer)
  }, [checkInTime])

  const getLocation = () => {
    if (!currentLecture) return
    setError("")
    setSuccess("")
    setLoading(true)

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.")
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        const userLocation = { latitude, longitude, accuracy }
        setLocation(userLocation)

        if (map) {
          new window.google.maps.Marker({
            position: { lat: latitude, lng: longitude },
            map,
            title: "Your Location",
            icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
          })

          new window.google.maps.Circle({
            center: { lat: latitude, lng: longitude },
            map,
            radius: accuracy,
            fillColor: "#ef4444",
            fillOpacity: 0.08,
            strokeColor: "#ef4444",
            strokeOpacity: 0.3,
            strokeWeight: 1,
          })

          const bounds = new window.google.maps.LatLngBounds()
          bounds.extend(new window.google.maps.LatLng(latitude, longitude))
          bounds.extend(
            new window.google.maps.LatLng(currentLecture.lectureLatitude, currentLecture.lectureLongitude),
          )
          map.fitBounds(bounds)
        }

        const distanceMeters = calculateDistance(
          latitude,
          longitude,
          currentLecture.lectureLatitude,
          currentLecture.lectureLongitude,
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

  const submitAttendance = useCallback(
    async (timeSec?: number) => {
      if (!currentLecture || !location) return
      const sec = timeSec ?? timeInSection
      setLoading(true)
      setError("")
      try {
        const response = await fetch("/api/attendance/mark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            lectureId: currentLecture.id,
            latitude: location.latitude,
            longitude: location.longitude,
            faceVerified: true,
            timeInSection: sec,
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          setError(data.message || "Failed to mark attendance")
          return
        }
        setSuccess("Attendance marked successfully!")
        setTimeout(() => router.push("/student/dashboard"), 2000)
      } catch {
        setError("An error occurred while marking attendance")
      } finally {
        setLoading(false)
      }
    },
    [currentLecture, location, router, timeInSection],
  )

  const handleFaceAuthSuccess = () => {
    setShowFaceAuth(false)

    if (faceAuthType === "start") {
      setStartFaceDone(true)
      setCheckInTime(new Date())
      setFaceAuthType("end")
      setSuccess("Face verified at lecture start. Time tracking started.")
      return
    }

    const elapsed = checkInTime ? Math.floor((Date.now() - checkInTime.getTime()) / 1000) : timeInSection
    if (elapsed < 300) {
      setError(`You must stay for at least 5 minutes. Current time: ${Math.floor(elapsed / 60)}m`)
      return
    }
    setEndFaceDone(true)
    setSuccess(`Lecture attendance verified! Total duration: ${Math.floor(elapsed / 60)}m`)
    void submitAttendance(elapsed)
  }

  const markAttendance = () => {
    if (!currentLecture || !location) {
      setError("Location not available")
      return
    }

    if (!distance || distance > currentLecture.allowedRadius) {
      setError(
        `You are ${distance ? distance + "m" : "too far"} from the lecture location. Must be within ${currentLecture.allowedRadius}m.`,
      )
      return
    }

    if (!startFaceDone) {
      setFaceAuthType("start")
      setShowFaceAuth(true)
      return
    }

    if (!endFaceDone) {
      setFaceAuthType("end")
      setShowFaceAuth(true)
      return
    }
  }

  if (!currentLecture && !lectureLoading) {
    return (
      <ProtectedRoute allowedRoles={["student"]}>
        <main className="min-h-screen p-8">
          <p className="text-gray-700">{error || "No lecture."}</p>
          <Button className="mt-4" onClick={() => router.push("/student/dashboard")}>
            Back
          </Button>
        </main>
      </ProtectedRoute>
    )
  }

  if (!currentLecture) {
    return (
      <ProtectedRoute allowedRoles={["student"]}>
        <main className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </main>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mark Attendance - Map View</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {currentLecture.building}, Room {currentLecture.roomNumber}
              </p>
            </div>
            <Button onClick={() => router.push("/student/dashboard")} variant="outline" size="sm">
              Back
            </Button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {mapKeyMissing && (
            <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Set <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in <code>.env.local</code> to
              enable the map.
            </div>
          )}

          {showFaceAuth && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-auto">
                <FaceAuthentication
                  type={faceAuthType}
                  lectureId={currentLecture.id}
                  onSuccess={() => {
                    handleFaceAuthSuccess()
                  }}
                  onError={(err) => setError(err)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-full overflow-hidden">
                <div ref={mapRef} style={{ width: "100%", height: "500px" }} className="rounded-lg bg-slate-100" />
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 mt-4">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white text-sm">Lecture Location Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Building</p>
                      <p className="text-gray-900 dark:text-white font-semibold">{currentLecture.building}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Room</p>
                      <p className="text-gray-900 dark:text-white font-semibold">{currentLecture.roomNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Section</p>
                      <p className="text-gray-900 dark:text-white font-semibold">{currentLecture.section}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Allowed Radius</p>
                      <p className="text-gray-900 dark:text-white font-semibold">{currentLecture.allowedRadius}m</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-gray-900 dark:text-white text-sm">Lecture Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">Course</p>
                    <p className="text-gray-900 dark:text-white font-semibold">{currentLecture.course_name}</p>
                    <p className="text-gray-500 dark:text-gray-500 text-xs">{currentLecture.course_code}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">Time</p>
                    <p className="text-gray-900 dark:text-white font-semibold">
                      {[currentLecture.start_time, currentLecture.end_time].filter(Boolean).join(" - ") || "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {checkInTime && (
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <p className="text-gray-600 dark:text-gray-400 text-xs mb-2">Time in Lecture</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {Math.floor(timeInSection / 60)}m {timeInSection % 60}s
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Minimum 5 minutes required for checkout</p>
                  </CardContent>
                </Card>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded p-3 flex gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <p className="text-emerald-700 dark:text-emerald-300 text-sm">{success}</p>
                </div>
              )}

              {location && distance !== null && (
                <Card
                  className={`border-2 ${
                    distance <= currentLecture.allowedRadius
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                  }`}
                >
                  <CardContent className="pt-6">
                    <p className="text-gray-600 dark:text-gray-400 text-xs mb-2">Distance from Lecture</p>
                    <p
                      className={`text-3xl font-bold ${
                        distance <= currentLecture.allowedRadius
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {distance}m
                    </p>
                  </CardContent>
                </Card>
              )}

              <Button onClick={getLocation} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 mr-2" />
                    Get My Location
                  </>
                )}
              </Button>

              <Button
                onClick={markAttendance}
                disabled={loading || !location || distance === null || distance > currentLecture.allowedRadius}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : !startFaceDone ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Start verification (face + location)
                  </>
                ) : !endFaceDone ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    End verification (min 5 min)
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Done
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  )
}
