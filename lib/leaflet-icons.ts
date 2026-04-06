/** Call once per Leaflet import (client-only) so default markers work with bundlers. */
export function fixLeafletDefaultIcons(L: typeof import("leaflet")) {
  type IconProto = { _getIconUrl?: string }
  delete (L.Icon.Default.prototype as IconProto)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  })
}
