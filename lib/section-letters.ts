/** Spreadsheet-style letters: 0 → A, 25 → Z, 26 → AA, … (for campus grid pins). */

export function sectionIndexToLetters(zeroBased: number): string {
  if (!Number.isFinite(zeroBased) || zeroBased < 0) return "A"
  let n = zeroBased + 1
  let s = ""
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/** Parses A, Z, AA, BD, etc. Returns 0-based index or null if invalid. */
export function sectionLettersToZeroBased(letters: string): number | null {
  const u = letters.trim().toUpperCase()
  if (!/^[A-Z]+$/.test(u)) return null
  let oneBased = 0
  for (const ch of u) {
    oneBased = oneBased * 26 + (ch.charCodeAt(0) - 64)
  }
  return oneBased - 1
}

export function formatSectionRoomLabel(letters: string): string {
  return `Section ${letters.toUpperCase()}`
}
