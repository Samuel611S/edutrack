import campusGps from "@/lib/campus-gps.json"
import { sectionLettersToZeroBased } from "@/lib/section-letters"

export type LatLngTuple = [number, number]

type CampusGpsShape = {
  sections?: Record<string, LatLngTuple[]>
}

const campusData = campusGps as unknown as CampusGpsShape

const MAX_NUMBERED_SECTION = (() => {
  let max = 0
  for (const k of Object.keys(campusData.sections || {})) {
    const m = /^section_(\d+)$/.exec(k)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return max
})()

function normalizeLocation(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
}

export function lectureLocationToSectionKey(location: string): string | null {
  const raw = normalizeLocation(location)
  if (!raw) return null

  const sections = campusData.sections
  if (sections) {
    const byNorm = new Map<string, string>()
    for (const key of Object.keys(sections)) byNorm.set(normalizeLocation(key), key)
    const direct = byNorm.get(raw)
    if (direct) return direct
  }

  const letterMatch = raw.match(/\bsection\s+([a-z]+)\b/)
  if (letterMatch?.[1] && MAX_NUMBERED_SECTION > 0) {
    const idx = sectionLettersToZeroBased(letterMatch[1])
    if (idx != null && idx >= 0 && idx < MAX_NUMBERED_SECTION) {
      const key = `section_${String(idx + 1).padStart(2, "0")}`
      if (sections?.[key]) return key
    }
  }

  const numMatch = raw.match(/\bsection\s*(\d+)\b/)
  if (numMatch?.[1] && MAX_NUMBERED_SECTION > 0) {
    const n = parseInt(numMatch[1], 10)
    if (n >= 1 && n <= MAX_NUMBERED_SECTION) {
      const key = `section_${String(n).padStart(2, "0")}`
      if (sections?.[key]) return key
    }
  }

  if (raw.includes("entrance")) return "building"
  if (raw.includes("corridor")) return "building"
  if (raw.includes("building")) return "building"

  return null
}

export function getSectionPolygonByKey(key: string): LatLngTuple[] | null {
  const sections = campusData.sections
  const poly = sections?.[key]
  return Array.isArray(poly) && poly.length >= 3 ? poly : null
}

export function pointInPolygon(lat: number, lng: number, polygon: LatLngTuple[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i]
    const [yj, xj] = polygon[j]
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi
    if (intersect) inside = !inside
  }
  return inside
}

