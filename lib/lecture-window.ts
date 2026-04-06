/** Build local start/end instants for a lecture row (date + time strings from SQLite). */

export function parseLectureBounds(
  lectureDate: string,
  startTime: string,
  endTime: string,
): { startMs: number; endMs: number; durationMs: number } {
  const datePart = lectureDate.trim().split(/[T ]/)[0]
  const [y, mo, d] = datePart.split("-").map((x) => parseInt(x, 10))
  if (!y || !mo || !d) {
    return { startMs: NaN, endMs: NaN, durationMs: NaN }
  }

  const parseHM = (t: string) => {
    const parts = t.trim().split(":")
    const h = parseInt(parts[0] ?? "0", 10)
    const m = parseInt(parts[1] ?? "0", 10)
    return { h, m }
  }

  const s = parseHM(startTime)
  const e = parseHM(endTime)
  const startMs = new Date(y, mo - 1, d, s.h, s.m, 0, 0).getTime()
  const endMs = new Date(y, mo - 1, d, e.h, e.m, 0, 0).getTime()
  return { startMs, endMs, durationMs: endMs - startMs }
}

export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—"
  const m = Math.round(ms / 60000)
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const rest = m % 60
    return rest ? `${h}h ${rest}m` : `${h}h`
  }
  return `${m} min`
}
