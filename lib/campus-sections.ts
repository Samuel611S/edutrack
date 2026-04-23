import campusGps from "@/lib/campus-gps.json"

export type LatLngTuple = [number, number]

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

  // Direct match against known section keys (after normalization)
  const sections = (campusGps as any).sections as Record<string, LatLngTuple[]> | undefined
  if (sections) {
    const byNorm = new Map<string, string>()
    for (const key of Object.keys(sections)) byNorm.set(normalizeLocation(key), key)
    const direct = byNorm.get(raw)
    if (direct) return direct
  }

  // Common lecture naming patterns:
  // We no longer keep per-classroom polygons; "Section A–F" should still require
  // the student to be inside the *building* polygon.
  const m = raw.match(/\bsection\s*([a-f])\b/)
  if (m?.[1]) return "building"

  const single = raw.match(/^\s*([a-f])\s*$/)
  if (single?.[1]) return "building"

  if (raw.includes("entrance")) return "entrance"
  if (raw.includes("corridor")) return "corridor"
  if (raw.includes("building")) return "building"

  return null
}

export function getSectionPolygonByKey(key: string): LatLngTuple[] | null {
  const sections = (campusGps as any).sections as Record<string, LatLngTuple[]> | undefined
  const poly = sections?.[key]
  return Array.isArray(poly) && poly.length >= 3 ? poly : null
}

// Ray-casting algorithm; expects polygon as [lat,lng] and point as (lat,lng).
export function pointInPolygon(lat: number, lng: number, polygon: LatLngTuple[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i] // lat, lng
    const [yj, xj] = polygon[j]
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi
    if (intersect) inside = !inside
  }
  return inside
}

