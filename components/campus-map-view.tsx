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

type LatLngTuple = [number, number]

function toTitle(s: string) {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .replace(/\bAou\b/g, "AOU")
}

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

      // Building outline + indoor sections (polygons)
      const sections = (campusGps as any).sections as Record<string, LatLngTuple[]> | undefined
      const centers = (campusGps as any).centers as Record<string, LatLngTuple> | undefined
      if (sections) {
        // Use "building" section as the outline + fitBounds target
        const buildingPoly = sections.building
        if (Array.isArray(buildingPoly) && buildingPoly.length >= 3) {
          const buildingLayer = L.polygon(buildingPoly, {
            stroke: false,
            fillColor: "#38bdf8",
            fillOpacity: 0.1,
          })
            .addTo(map)
            .bindPopup("<strong>Building</strong>")

          try {
            map.fitBounds(buildingLayer.getBounds(), { padding: [18, 18] })
          } catch {
            // ignore
          }
        }

        const palette = [
          "#2563eb",
          "#7c3aed",
          "#db2777",
          "#ea580c",
          "#16a34a",
          "#0891b2",
          "#a855f7",
          "#e11d48",
        ]
        let i = 0
        for (const [key, poly] of Object.entries(sections)) {
          if (!Array.isArray(poly) || poly.length < 3) continue
          if (key === "building") continue
          const color = palette[i % palette.length]
          i++
          const name = toTitle(key)
          const layer = L.polygon(poly, {
            stroke: false,
            fillColor: color,
            fillOpacity: 0.22,
          })
            .addTo(map)
            .bindPopup(`<strong>${name}</strong>`)

          // Make it obvious on mobile (no hover): show a permanent label where possible.
          const center = centers?.[key]
          if (center && Array.isArray(center) && center.length === 2) {
            const label = L.marker(center, {
              interactive: false,
              icon: L.divIcon({
                className: "",
                html: `<div style="
                  transform: translate(-50%, -50%);
                  padding: 2px 6px;
                  border-radius: 999px;
                  background: rgba(15, 23, 42, 0.78);
                  border: 1px solid rgba(148, 163, 184, 0.55);
                  color: white;
                  font-size: 11px;
                  line-height: 1.2;
                  white-space: nowrap;
                ">${name}</div>`,
              }),
            }).addTo(map)
            label.setZIndexOffset(1000)
          }

          // Keep sections above the building fill.
          try {
            layer.bringToFront()
          } catch {
            // ignore
          }
        }
      }

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
          style={{ width: "100%", zIndex: 0 }}
          className="h-[60vh] min-h-[360px] max-h-[560px] rounded-lg overflow-hidden border border-slate-600 bg-slate-900/50"
        />
        {!ready && <p className="text-slate-500 text-xs mt-2">Loading map…</p>}
      </CardContent>
    </Card>
  )
}
