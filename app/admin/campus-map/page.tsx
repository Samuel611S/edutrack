"use client"

import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CampusMapView } from "@/components/campus-map-view"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export default function CampusMapPage() {
  const { user } = useAuth()
  const router = useRouter()

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <main className="min-h-screen bg-slate-900">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Campus Map Management</h1>
              <p className="text-slate-400 text-sm">Manage lecture locations and GPS zones</p>
            </div>
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-200 hover:bg-slate-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Campus Map */}
          <CampusMapView />

          {/* Management Info */}
          <Card className="bg-slate-800 border-slate-700 mt-8">
            <CardHeader>
              <CardTitle className="text-white">Location Configuration</CardTitle>
              <CardDescription className="text-slate-400">
                Configure lecture locations and GPS verification zones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-white font-semibold mb-3">Active Buildings</h3>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                      Building A - Main Campus (30.0553, 31.3399)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                      Building B - Engineering (30.0545, 31.3405)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                      Building C - Library (30.0560, 31.3395)
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-white font-semibold mb-3">Verification Settings</h3>
                  <ul className="space-y-2 text-slate-300 text-sm">
                    <li>Default Radius: 100m</li>
                    <li>Location Accuracy Threshold: ±50m</li>
                    <li>GPS Signal Required: Yes</li>
                    <li>Real-time Verification: Enabled</li>
                  </ul>
                </div>
              </div>

              <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white">Edit Location Settings</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </ProtectedRoute>
  )
}
