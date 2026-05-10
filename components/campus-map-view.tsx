"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

type LatLngTuple = [number, number]

type CampusGpsShape = {
  institution: string
  address: string
  center: { lat: number; lng: number }
  mapMarkers: CampusLocation[]
  sections?: Record<string, LatLngTuple[]>
  centers?: Record<string, LatLngTuple>
}

const gps = campusGps as unknown as CampusGpsShape

const campusLocations = gps.mapMarkers

function toTitle(s: string) {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .replace(/\bAou\b/g, "AOU")
}

interface CampusMapViewProps {
  adminMode?: boolean
  onSectionAdded?: () => void
}

export function CampusMapView({ adminMode = false, onSectionAdded }: CampusMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null)
  const [ready, setReady] = useState(false)
  const [addingSection, setAddingSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState("")
  const [newSectionLat, setNewSectionLat] = useState("")
  const [newSectionLng, setNewSectionLng] = useState("")
  const [dbSections, setDbSections] = useState<Array<{
    id: string
    section_name: string
    latitude: number
    longitude: number
    description: string | null
  }>>([])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    let cancelled = false

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return
      fixLeafletDefaultIcons(L)

      const centerLat = gps.center.lat
      const centerLng = gps.center.lng

      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([centerLat, centerLng], 18)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Remove click handler for admin mode - coordinates will be entered manually

      const sections = gps.sections
      const centers = gps.centers
      if (sections) {
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

      // Add database sections if in admin mode
      if (adminMode) {
        dbSections.forEach((section) => {
          const marker = L.circleMarker([section.latitude, section.longitude], {
            radius: 8,
            fillColor: "#10b981",
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          }).addTo(map)
          marker.bindPopup(`<strong>${section.section_name}</strong><br/><span style="opacity:.85">Database Section</span>`)
        })
      }

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

  // Fetch sections from database when in admin mode
  useEffect(() => {
    if (!adminMode) return

    const fetchSections = async () => {
      try {
        const res = await fetch('/api/admin/sections', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setDbSections(data.sections || [])
        }
      } catch (error) {
        console.error('Failed to fetch sections:', error)
      }
    }

    fetchSections()
  }, [adminMode])

  const handleAddSection = async () => {
    if (!newSectionName.trim() || !newSectionLat.trim() || !newSectionLng.trim()) return

    const lat = parseFloat(newSectionLat)
    const lng = parseFloat(newSectionLng)

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Please enter valid coordinates')
      return
    }

    try {
      const res = await fetch('/api/admin/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          section_name: newSectionName.trim(),
          latitude: lat,
          longitude: lng,
          description: '',
        }),
      })

      if (res.ok) {
        setAddingSection(false)
        setNewSectionName('')
        setNewSectionLat('')
        setNewSectionLng('')
        // Refresh sections
        const data = await res.json()
        setDbSections(prev => [...prev, data.section])
        onSectionAdded?.()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to add section')
      }
    } catch (error) {
      console.error('Error adding section:', error)
      alert('Failed to add section')
    }
  }

  const cancelAddSection = () => {
    setAddingSection(false)
    setNewSectionName('')
    setNewSectionLat('')
    setNewSectionLng('')
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">{gps.institution}</CardTitle>
              <CardDescription className="text-slate-400">{gps.address}</CardDescription>
            </div>
            {adminMode && (
              <Button
                onClick={() => setAddingSection(!addingSection)}
                variant={addingSection ? "destructive" : "default"}
                size="sm"
              >
                {addingSection ? "Cancel Adding" : "Add Section"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={mapRef}
            style={{ width: "100%", zIndex: 0 }}
            className="h-[60vh] min-h-[360px] max-h-[560px] rounded-lg overflow-hidden border border-slate-600 bg-slate-900/50"
          />
          {!ready && <p className="text-slate-500 text-xs mt-2">Loading map…</p>}
          {addingSection && (
            <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600">
              <p className="text-slate-300 text-sm mb-3">
                Enter the section name and coordinates to add a new section.
              </p>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="section-name" className="text-slate-200">Section Name</Label>
                  <Input
                    id="section-name"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="e.g., Section A, Library, Parking Lot"
                    className="bg-slate-950 border-slate-700 text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="section-lat" className="text-slate-200">Latitude</Label>
                    <Input
                      id="section-lat"
                      type="number"
                      step="any"
                      value={newSectionLat}
                      onChange={(e) => setNewSectionLat(e.target.value)}
                      placeholder="e.g., 24.7136"
                      className="bg-slate-950 border-slate-700 text-slate-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="section-lng" className="text-slate-200">Longitude</Label>
                    <Input
                      id="section-lng"
                      type="number"
                      step="any"
                      value={newSectionLng}
                      onChange={(e) => setNewSectionLng(e.target.value)}
                      placeholder="e.g., 46.6753"
                      className="bg-slate-950 border-slate-700 text-slate-100"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddSection} 
                    disabled={!newSectionName.trim() || !newSectionLat.trim() || !newSectionLng.trim()}
                  >
                    Add Section
                  </Button>
                  <Button variant="outline" onClick={cancelAddSection}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
