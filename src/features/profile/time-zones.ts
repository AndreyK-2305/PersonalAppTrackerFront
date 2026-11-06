/**
 * Zonas horarias IANA disponibles en el navegador, agrupadas por región ("America", "Europe"...).
 * El backend valida que la zona elegida exista.
 */
export function groupedTimeZones(current: string): [region: string, zones: string[]][] {
  const zones = new Set(Intl.supportedValuesOf("timeZone"))
  zones.add(current)

  const groups = new Map<string, string[]>()
  for (const zone of [...zones].sort()) {
    const region = zone.includes("/") ? zone.slice(0, zone.indexOf("/")) : "Otras"
    groups.set(region, [...(groups.get(region) ?? []), zone])
  }
  return [...groups.entries()]
}

/** "America/Argentina/Buenos_Aires" → "Argentina / Buenos Aires" (sin la región, que es el grupo). */
export function timeZoneLabel(zone: string): string {
  const name = zone.includes("/") ? zone.slice(zone.indexOf("/") + 1) : zone
  return name.replaceAll("_", " ").replaceAll("/", " / ")
}
