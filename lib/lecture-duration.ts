export const LECTURE_DURATION_MINUTES = 90

export function parseHHmm(t: string): { h: number; m: number } | null {
  const parts = String(t).trim().split(":")
  if (parts.length < 2) return null
  const h = parseInt(parts[0]!, 10)
  const m = parseInt(parts[1]!, 10)
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}

export function minutesBetweenSameDay(start: string, end: string): number | null {
  const a = parseHHmm(start)
  const b = parseHHmm(end)
  if (!a || !b) return null
  const sa = a.h * 60 + a.m
  const eb = b.h * 60 + b.m
  if (eb < sa) return null
  return eb - sa
}

export function endTimeFromStartPlusMinutes(start: string, addMinutes: number): string | null {
  const a = parseHHmm(start)
  if (!a) return null
  const total = a.h * 60 + a.m + addMinutes
  if (total >= 24 * 60) return null
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}
