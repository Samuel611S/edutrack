import campusGps from "@/lib/campus-gps.json"

export type LatLngTuple = [number, number]

type CampusGpsShape = {
  sections?: Record<string, LatLngTuple[]>
}

const campusData = campusGps as unknown as CampusGpsShape

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

  const m = raw.match(/\bsection\s*([a-f])\b/)
  if (m?.[1]) return "building"

  const single = raw.match(/^\s*([a-f])\s*$/)
  if (single?.[1]) return "building"

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

