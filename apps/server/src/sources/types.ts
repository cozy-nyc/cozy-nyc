import type { CozyEvent } from "@cozy/shared";
import type { TimeWindow } from "../time.js";

/** What every source adapter produces. The server adds id, heat and comment counts. */
export type NormalizedEvent = Omit<CozyEvent, "id" | "heat" | "commentCount"> & {
  /** 0..1 popularity signal from the source (RSVPs, "interested" counts, sell-through...). */
  popularity: number;
};

export interface EventSource {
  id: CozyEvent["source"];
  enabled: boolean;
  fetchTonight(window: TimeWindow): Promise<NormalizedEvent[]>;
}
