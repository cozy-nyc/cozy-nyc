import type { CozyEvent } from "@cozy/shared";

/**
 * PLACEHOLDER venue details for the seed venues (apps/server/src/sources/seed.ts).
 *
 * Events only carry a venue name and coordinates today. This stands in for a real
 * venue table and API (docs/PLAN.md, "Venue table") so the location card has an
 * address and links to show. Addresses and handles were written from memory and
 * have not been checked against the venues' own sites; verify before launch.
 */
export interface VenueInfo {
  address: string;
  website?: string;
  instagram?: string;
}

const VENUES: Record<string, VenueInfo> = {
  Elsewhere: { address: "599 Johnson Ave, Brooklyn, NY 11237", website: "https://www.elsewhere.club", instagram: "elsewherespace" },
  Nowadays: { address: "56-06 Cooper Ave, Ridgewood, NY 11385", website: "https://nowadays.nyc", instagram: "nowadaysnyc" },
  "Good Room": { address: "98 Meserole Ave, Brooklyn, NY 11222", website: "https://goodroombk.com", instagram: "goodroombk" },
  "Public Records": { address: "233 Butler St, Brooklyn, NY 11217", website: "https://publicrecords.nyc", instagram: "publicrecordsnyc" },
  "Bossa Nova Civic Club": { address: "1271 Myrtle Ave, Brooklyn, NY 11221", website: "https://www.bossanovacivicclub.com", instagram: "bossanovacivicclub" },
  "House of Yes": { address: "2 Wyckoff Ave, Brooklyn, NY 11237", website: "https://www.houseofyes.org", instagram: "houseofyesnyc" },
  "Knockdown Center": { address: "52-19 Flushing Ave, Maspeth, NY 11378", website: "https://knockdown.center", instagram: "knockdowncenter" },
  "Baby's All Right": { address: "146 Broadway, Brooklyn, NY 11211", website: "https://www.babysallright.com", instagram: "babysallright" },
  "Bowery Ballroom": { address: "6 Delancey St, New York, NY 10002", website: "https://www.boweryballroom.com", instagram: "boweryballroom" },
  "Mercury Lounge": { address: "217 E Houston St, New York, NY 10002", website: "https://www.mercuryeastpresents.com/mercurylounge" },
  "Webster Hall": { address: "125 E 11th St, New York, NY 10003", website: "https://www.websterhall.com", instagram: "websterhall" },
  "Blue Note": { address: "131 W 3rd St, New York, NY 10012", website: "https://www.bluenotejazz.com", instagram: "bluenotenyc" },
  "Village Vanguard": { address: "178 7th Ave S, New York, NY 10014", website: "https://villagevanguard.com" },
  "Smalls Jazz Club": { address: "183 W 10th St, New York, NY 10014", website: "https://www.smallslive.com" },
  "Comedy Cellar": { address: "117 MacDougal St, New York, NY 10012", website: "https://www.comedycellar.com" },
  "Le Bain": { address: "848 Washington St, New York, NY 10014", website: "https://www.lebainnewyork.com" },
  "Apollo Theater": { address: "253 W 125th St, New York, NY 10027", website: "https://www.apollotheater.org", instagram: "apollotheater" },
};

export function venueFor(event: Pick<CozyEvent, "venueName">): VenueInfo | undefined {
  return VENUES[event.venueName];
}

/** Google Maps search link: by name and address when we know it, else by coordinates. */
export function googleMapsUrl(event: Pick<CozyEvent, "venueName" | "lng" | "lat">): string {
  const venue = venueFor(event);
  const query = venue ? `${event.venueName}, ${venue.address}` : `${event.lat},${event.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
