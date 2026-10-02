import type { EventSource } from "./types.js";

/**
 * Placeholders for sources we want but can't legitimately pull from yet.
 * See docs/DATA_SOURCES.md before filling these in.
 *
 * - Resident Advisor: no public API. ra.co/graphql is the site's internal
 *   endpoint; using it without permission is a ToS risk. Ask RA for a
 *   partnership/feed first.
 * - Eventbrite: public event search was shut off in 2020. The API only
 *   returns events for known organizer/venue IDs, so this would need a
 *   curated list of NYC organizers.
 */
export const residentAdvisorSource: EventSource = {
  id: "ra",
  enabled: false,
  async fetchTonight() {
    return [];
  },
};

export const eventbriteSource: EventSource = {
  id: "eventbrite",
  enabled: false,
  async fetchTonight() {
    return [];
  },
};
