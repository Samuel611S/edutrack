"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fixLeafletDefaultIcons } from "@/lib/leaflet-icons"
import campusGps from "@/lib/campus-gps.json"
import "leaflet/dist/leaflet.css"

interface CampusLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  type: "building" | "parking" | "facility"
}

const campusLocations = campusGps.mapMarkers as CampusLocation[]

export function CampusMapView() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    let cancelled = false

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return
      fixLeafletDefaultIcons(L)

      const centerLat = campusGps.center.lat
      const centerLng = campusGps.center.lng

      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([centerLat, centerLng], 18)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      campusLocations.forEach((loc) => {
        const color = loc.type === "building" ? "#2563eb" : loc.type === "parking" ? "#ca8a04" : "#dc2626"
        const marker = L.circleMarker([loc.latitude, loc.longitude], {
          radius: 10,
          fillColor: color,
          color: "#fff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85,
        }).addTo(map)
        marker.bindPopup(`<strong>${loc.name}</strong><br/><span style="opacity:.85">${loc.type}</span>`)
      })

      mapInstanceRef.current = map
      setReady(true)
      setTimeout(() => map.invalidateSize(), 100)
    })

    return () => {
      cancelled = true
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
      setReady(false)
    }
  }, [])

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">{campusGps.institution}</CardTitle>
        <CardDescription className="text-slate-400">
          {campusGps.address} — Leaflet + OpenStreetMap (no API key)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-slate-400 text-sm mb-3">
          Map tiles by{" "}
          <a href="https://www.openstreetmap.org/" className="text-indigo-300 underline" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>{" "}
          contributors.
        </p>
        <div
          ref={mapRef}
          style={{ width: "100%", height: "420px", zIndex: 0 }}
          className="rounded-lg overflow-hidden border border-slate-600 bg-slate-900/50"
        />
        {!ready && <p className="text-slate-500 text-xs mt-2">Loading map…</p>}
      </CardContent>
    </Card>
  )
}
