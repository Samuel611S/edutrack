"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CampusMapView } from "@/components/campus-map-view"
import campusGps from "@/lib/campus-gps.json"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

export default function CampusMapPage() {
  const router = useRouter()
  const [showSettings, setShowSettings] = useState(false)
  const [defaults, setDefaults] = useState({ radiusM: "100", accuracyM: "50" })

  const storageKey = "edutrack.locationDefaults.v1"
  const canUseStorage = useMemo(() => typeof window !== "undefined", [])

  useEffect(() => {
    if (!canUseStorage) return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as { radiusM?: number; accuracyM?: number }
      setDefaults({
        radiusM: String(parsed.radiusM ?? 100),
        accuracyM: String(parsed.accuracyM ?? 50),
      })
    } catch {
      // ignore
    }
  }, [canUseStorage])

  const saveDefaults = () => {
    if (!canUseStorage) return
    const radiusM = Math.max(5, Math.min(1000, Number(defaults.radiusM || 100)))
    const accuracyM = Math.max(5, Math.min(500, Number(defaults.accuracyM || 50)))
    window.localStorage.setItem(storageKey, JSON.stringify({ radiusM, accuracyM }))
    setDefaults({ radiusM: String(radiusM), accuracyM: String(accuracyM) })
    setShowSettings(false)
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <main className="min-h-screen bg-slate-900">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Campus Map Management</h1>
              <p className="text-slate-400 text-sm">{campusGps.institution}</p>
              <p className="text-slate-500 text-xs mt-0.5 max-w-xl">{campusGps.address}</p>
              <p className="text-slate-400 text-xs mt-1">Leaflet + OpenStreetMap — no API key required</p>
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
                Lecture GPS zones use the same coordinates stored in the database (labels match the map markers).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-white font-semibold mb-3">Markers on map</h3>
                  <ul className="space-y-2 text-slate-300 text-sm">
                    {campusGps.mapMarkers.map((m) => (
                      <li key={m.id} className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full shrink-0 ${
                            m.type === "parking"
                              ? "bg-amber-500"
                              : m.type === "facility"
                                ? "bg-emerald-500"
                                : "bg-blue-400"
                          }`}
                        />
                        <span>
                          {m.name} ({m.latitude}, {m.longitude})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-white font-semibold mb-3">Verification Settings</h3>
                  <ul className="space-y-2 text-slate-300 text-sm">
                    <li>Default Radius: {defaults.radiusM}m</li>
                    <li>Location Accuracy Threshold: ±{defaults.accuracyM}m</li>
                    <li>GPS Signal Required: Yes</li>
                    <li>Real-time Verification: Enabled</li>
                  </ul>
                </div>
              </div>

              <Button
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white"
                type="button"
                onClick={() => setShowSettings((v) => !v)}
              >
                Edit Location Settings
              </Button>

              {showSettings && (
                <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-200 mb-1">Default radius (meters)</label>
                      <input
                        value={defaults.radiusM}
                        onChange={(e) => setDefaults((d) => ({ ...d, radiusM: e.target.value }))}
                        inputMode="numeric"
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="100"
                      />
                      <p className="text-xs text-slate-400 mt-1">Used as the default when creating new lectures.</p>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-200 mb-1">Accuracy threshold (meters)</label>
                      <input
                        value={defaults.accuracyM}
                        onChange={(e) => setDefaults((d) => ({ ...d, accuracyM: e.target.value }))}
                        inputMode="numeric"
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="50"
                      />
                      <p className="text-xs text-slate-400 mt-1">Recommended: 30–80m for phones.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={saveDefaults}>
                      Save
                    </Button>
                    <Button type="button" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800" onClick={() => setShowSettings(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </ProtectedRoute>
  )
}
