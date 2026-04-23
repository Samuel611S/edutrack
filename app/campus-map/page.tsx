"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { CampusMapView } from "@/components/campus-map-view"
import campusGps from "@/lib/campus-gps.json"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CampusMapPublicPage() {
  const router = useRouter()

  return (
    <ProtectedRoute allowedRoles={["admin", "teacher", "student"]}>
      <main className="min-h-screen bg-slate-900">
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Campus Map</h1>
              <p className="text-slate-400 text-sm">{campusGps.institution}</p>
            </div>
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto border-slate-600 text-slate-200 hover:bg-slate-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <CampusMapView />
        </div>
      </main>
    </ProtectedRoute>
  )
}

