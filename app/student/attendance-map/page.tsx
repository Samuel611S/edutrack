"use client"

import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState, useRef } from "react"
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
  course: string
  courseCode: string
  time: string
  location: string
  roomNumber: string
  building: string
  section: string
  lectureLatitude: number
  lectureLongitude: number
  allowedRadius: number
}

declare global {
  interface Window {
    google: any
  }
}

export default function AttendanceMapPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [location, setLocation] = useState<AttendanceLocation | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [showFaceAuth, setShowFaceAuth] = useState(false)
  const [faceAuthType, setFaceAuthType] = useState<"start" | "end">("start")
  const [faceAuthComplete, setFaceAuthComplete] = useState(false)
  const [timeInSection, setTimeInSection] = useState(0)
  const [checkInTime, setCheckInTime] = useState<Date | null>(null)

  const currentLecture: LectureInfo = {
    id: "lecture_001",
    course: "Advanced Database Systems",
    courseCode: "CS301",
    time: "10:00 AM - 11:30 AM",
    location: "Building A, Room 201",
    building: "Building A",
    roomNumber: "201",
    section: "Section A",
    lectureLatitude: 30.0553,
    lectureLongitude: 31.3399,
    allowedRadius: 50,
  }

  useEffect(() => {
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY`
    script.async = true
    script.defer = true
    script.onload = () => {
      setMapLoaded(true)
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (!checkInTime) return

    const timer = setInterval(() => {
      const elapsed = Math.floor((new Date().getTime() - checkInTime.getTime()) / 1000)
      setTimeInSection(elapsed)
    }, 1000)

    return () => clearInterval(timer)
  }, [checkInTime])

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
          const userMarker = new window.google.maps.Marker({
            position: { lat: latitude, lng: longitude },
            map: map,
            title: "Your Location",
            icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
          })

          new window.google.maps.Circle({
            center: { lat: latitude, lng: longitude },
            map: map,
            radius: accuracy,
            fillColor: "#ef4444",
            fillOpacity: 0.1,
            strokeColor: "#ef4444",
            strokeOpacity: 0.3,
            strokeWeight: 1,
          })

          const bounds = new window.google.maps.LatLngBounds()
          bounds.extend(new window.google.maps.LatLng(latitude, longitude))
          bounds.extend(new window.google.maps.LatLng(currentLecture.lectureLatitude, currentLecture.lectureLongitude))
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
        console.error("[v0] Geolocation error:", err)
        setError("Unable to access your location. Please enable location services.")
        setLoading(false)
      },
    )
  }

  const handleFaceAuthSuccess = (faceData: { timestamp: string; captured: boolean }) => {
    setFaceAuthComplete(true)
    setShowFaceAuth(false)

    if (faceAuthType === "start") {
      setCheckInTime(new Date())
      setSuccess(`Face verified at lecture start. Time tracking started.`)
    } else {
      if (timeInSection < 300) {
        setError(`You must stay for at least 5 minutes. Current time: ${Math.floor(timeInSection / 60)}m`)
        setFaceAuthComplete(false)
        return
      }
      setSuccess(`Lecture attendance verified! Total duration: ${Math.floor(timeInSection / 60)}m`)
    }
  }

  const markAttendance = async () => {
    if (!location) {
      setError("Location not available")
      return
    }

    if (!distance || distance > currentLecture.allowedRadius) {
      setError(
        `You are ${distance ? distance + "m" : "too far"} from the lecture location. Must be within ${currentLecture.allowedRadius}m of ${currentLecture.section}`,
      )
      return
    }

    if (!faceAuthComplete || faceAuthType === "start") {
      setShowFaceAuth(true)
      setFaceAuthType("start")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lectureId: currentLecture.id,
          studentId: user?.id,
          latitude: location.latitude,
          longitude: location.longitude,
          distance: distance,
          timeInSection: timeInSection,
          building: currentLecture.building,
          roomNumber: currentLecture.roomNumber,
          section: currentLecture.section,
          faceVerified: faceAuthComplete,
          timestamp: new Date().toISOString(),
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
      console.error("[v0] Attendance error:", err)
      setError("An error occurred while marking attendance")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mark Attendance - Map View</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {currentLecture.building}, {currentLecture.section}
              </p>
            </div>
            <Button onClick={() => router.push("/student/dashboard")} variant="outline" size="sm">
              Back
            </Button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {showFaceAuth && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-auto">
                <FaceAuthentication
                  type={faceAuthType}
                  lectureId={currentLecture.id}
                  onSuccess={handleFaceAuthSuccess}
                  onError={(err) => setError(err)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-full overflow-hidden">
                <div ref={mapRef} style={{ width: "100%", height: "500px" }} className="rounded-lg" />
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
                    <p className="text-gray-900 dark:text-white font-semibold">{currentLecture.course}</p>
                    <p className="text-gray-500 dark:text-gray-500 text-xs">{currentLecture.courseCode}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">Time</p>
                    <p className="text-gray-900 dark:text-white font-semibold">{currentLecture.time}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">Section</p>
                    <p className="text-gray-900 dark:text-white font-semibold">{currentLecture.section}</p>
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
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Minimum 5 minutes required</p>
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
                    <p
                      className={`text-xs mt-2 ${
                        distance <= currentLecture.allowedRadius
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-red-700 dark:text-red-300"
                      }`}
                    >
                      {distance <= currentLecture.allowedRadius
                        ? "Within allowed section"
                        : `${distance - currentLecture.allowedRadius}m outside allowed section`}
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
                ) : faceAuthComplete && faceAuthType === "end" ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Attendance
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {faceAuthType === "start" ? "Start Lecture" : "End Lecture"}
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
