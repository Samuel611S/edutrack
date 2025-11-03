"use client"

import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { MapPin, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

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
  lectureLatitude: number
  lectureLongitude: number
  allowedRadius: number // in meters
}

export default function AttendancePage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [location, setLocation] = useState<AttendanceLocation | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [isLocationSupported, setIsLocationSupported] = useState(true)

  // Mock lecture data - In production, fetch from database
  const currentLecture: LectureInfo = {
    id: "lecture_001",
    course: "Advanced Database Systems",
    courseCode: "CS301",
    time: "10:00 AM - 11:30 AM",
    location: "Building A, Room 201",
    lectureLatitude: 30.0553,
    lectureLongitude: 31.3399,
    allowedRadius: 100, // 100 meters
  }

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  // Get user's current location
  const getLocation = () => {
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

        // Calculate distance from lecture location
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

  // Mark attendance
  const markAttendance = async () => {
    if (!location) {
      setError("Location not available")
      return
    }

    if (!distance || distance > currentLecture.allowedRadius) {
      setError(
        `You are ${distance ? distance + "m" : "too far"} from the lecture location. Minimum distance required: ${currentLecture.allowedRadius}m`,
      )
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
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        {/* Header */}
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

        {/* Main Content */}
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Lecture Info Card */}
          <Card className="bg-white border-gray-200 shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-gray-900">{currentLecture.course}</CardTitle>
              <CardDescription className="text-gray-600">{currentLecture.courseCode}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-gray-600 text-sm">Lecture Time</p>
                  <p className="text-gray-900 font-medium">{currentLecture.time}</p>
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
                <p className="text-gray-900 font-semibold">{currentLecture.allowedRadius}m from lecture location</p>
              </div>
            </CardContent>
          </Card>

          {/* Location Verification Card */}
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
                        distance <= currentLecture.allowedRadius
                          ? "bg-emerald-50 border border-emerald-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin
                          className={`w-4 h-4 ${
                            distance <= currentLecture.allowedRadius ? "text-emerald-600" : "text-red-600"
                          }`}
                        />
                        <p className="text-gray-600 text-xs">Distance from Lecture Location</p>
                      </div>
                      <p
                        className={`font-semibold text-lg ${
                          distance <= currentLecture.allowedRadius ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {distance}m
                      </p>
                      {distance <= currentLecture.allowedRadius ? (
                        <p className="text-emerald-700 text-xs mt-1">You are within the allowed radius</p>
                      ) : (
                        <p className="text-red-700 text-xs mt-1">
                          You are {distance - currentLecture.allowedRadius}m outside the allowed radius
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

          {/* Mark Attendance Button */}
          <Button
            onClick={markAttendance}
            disabled={loading || !location || distance === null || distance > currentLecture.allowedRadius}
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

          {/* Info Box */}
          <Card className="bg-white border-gray-200 shadow-sm mt-6">
            <CardHeader>
              <CardTitle className="text-gray-900 text-sm">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>1. Click "Get My Location" to enable and retrieve your current GPS coordinates</p>
              <p>2. The system calculates your distance from the lecture location</p>
              <p>3. If you are within the allowed radius ({currentLecture.allowedRadius}m), you can mark attendance</p>
              <p>4. Your location is verified and recorded for attendance purposes</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </ProtectedRoute>
  )
}
