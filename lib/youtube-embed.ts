const YT_EMBED_BASE = "https://www.youtube.com/embed"

/** Base embed URL only (no autoplay). The student UI loads the iframe src on click so audio is allowed. */
function withStandardEmbedParams(videoId: string, incomingSearch?: URLSearchParams): string {
  const out = new URL(`${YT_EMBED_BASE}/${videoId}`)
  if (incomingSearch) {
    incomingSearch.forEach((value, key) => {
      if (key === "v") return
      out.searchParams.set(key, value)
    })
  }
  out.searchParams.set("playsinline", "1")
  out.searchParams.delete("autoplay")
  out.searchParams.delete("mute")
  return out.toString()
}

/** 11-char video id from our embed URL, for thumbnails. */
export function youtubeVideoIdFromEmbedUrl(embedUrl: string): string | null {
  try {
    const u = new URL(embedUrl)
    const m = u.pathname.match(/^\/embed\/([^/?]+)/)
    const id = m?.[1]
    if (id && /^[\w-]{11}$/.test(id)) return id
    return null
  } catch {
    return null
  }
}

/**
 * Call this synchronously inside a click handler, then assign the result to iframe.src.
 * Browsers tie unmuted autoplay to a recent user gesture; setting src in the same turn as the click does that.
 */
export function youtubeEmbedUrlForActivatedPlayer(embedBaseUrl: string): string {
  const u = new URL(embedBaseUrl)
  u.searchParams.set("autoplay", "1")
  u.searchParams.set("mute", "0")
  u.searchParams.set("playsinline", "1")
  return u.toString()
}

/** Returns a YouTube embed URL for iframes, or null if the string is not a recognized YouTube link. */
export function youtubeWatchOrShareToEmbed(url: string): string | null {
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^www\./, "")
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0]
      if (id && /^[\w-]{11}$/.test(id)) return withStandardEmbedParams(id)
      return null
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname.startsWith("/embed/")) {
        const id = u.pathname.replace(/^\/embed\//, "").split("/")[0]
        if (id && /^[\w-]{11}$/.test(id)) return withStandardEmbedParams(id, u.searchParams)
        return null
      }
      const v = u.searchParams.get("v")
      if (v && /^[\w-]{11}$/.test(v)) return withStandardEmbedParams(v, u.searchParams)
      const shorts = u.pathname.match(/^\/shorts\/([\w-]{11})/)
      if (shorts) return withStandardEmbedParams(shorts[1])
    }
  } catch {
    return null
  }
  return null
}
