"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CampusLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  type: "building" | "parking" | "facility"
}

declare global {
  interface Window {
    google: any
  }
}

export function CampusMapView() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Demo campus marker locations (EduTrack+)
  const campusLocations: CampusLocation[] = [
    {
      id: "bldg_a",
      name: "Building A - Main Campus",
      latitude: 30.0553,
      longitude: 31.3399,
      type: "building",
    },
    {
      id: "bldg_b",
      name: "Building B - Engineering",
      latitude: 30.0545,
      longitude: 31.3405,
      type: "building",
    },
    {
      id: "bldg_c",
      name: "Building C - Library",
      latitude: 30.056,
      longitude: 31.3395,
      type: "building",
    },
    {
      id: "parking_1",
      name: "Parking Lot 1",
      latitude: 30.053,
      longitude: 31.341,
      type: "parking",
    },
  ]

  // Load Google Maps
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key) return
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

  // Initialize map with campus locations
  useEffect(() => {
    if (mapLoaded && mapRef.current && !map) {
      const centerLat = 30.0553
      const centerLng = 31.3399

      const googleMap = new window.google.maps.Map(mapRef.current, {
        zoom: 15,
        center: { lat: centerLat, lng: centerLng },
        mapTypeControl: true,
        streetViewControl: true,
      })

      campusLocations.forEach((location) => {
        const iconColor = location.type === "building" ? "blue" : location.type === "parking" ? "yellow" : "red"

        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div class="bg-white p-2 rounded"><strong>${location.name}</strong><br/>${location.type}</div>`,
        })

        const marker = new window.google.maps.Marker({
          position: { lat: location.latitude, lng: location.longitude },
          map: googleMap,
          title: location.name,
          icon: `http://maps.google.com/mapfiles/ms/icons/${iconColor}-dot.png`,
        })

        marker.addListener("click", () => {
          infoWindow.open(googleMap, marker)
        })
      })

      setMap(googleMap)
    }
  }, [mapLoaded, map, campusLocations])

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Campus Map</CardTitle>
        <CardDescription className="text-slate-400">EduTrack+ — campus map and lecture locations</CardDescription>
      </CardHeader>
      <CardContent>
        {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
          <p className="text-slate-400 text-sm mb-2">
            Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local to load the map.
          </p>
        )}
        <div ref={mapRef} style={{ width: "100%", height: "400px" }} className="rounded-lg bg-slate-900/50" />
      </CardContent>
    </Card>
  )
}
