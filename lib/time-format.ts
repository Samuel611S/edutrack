/** Format `HH:mm` or `HH:mm:ss` (24h) for display, e.g. `2:30 PM`. */
export function formatTimeAmPm(hhmm: string | null | undefined): string {
  const raw = String(hhmm ?? "").trim()
  if (!raw) return "—"
  const head = raw.slice(0, 5)
  const [hs, ms] = head.split(":")
  const h = parseInt(hs || "0", 10)
  const m = parseInt(ms || "0", 10)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return raw
  const hour12 = h % 12 || 12
  const ampm = h < 12 ? "AM" : "PM"
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`
}

export function parseDeadlineMs(value: unknown): number | null {
  if (value == null || value === "") return null
  const t = new Date(String(value)).getTime()
  return Number.isNaN(t) ? null : t
}

export function formatDateTimeAmPm(value: string | null | undefined): string {
  if (value == null || value === "") return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}
