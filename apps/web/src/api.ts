import type { CozyEvent, EventComment } from "@cozy/shared";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";
export const WS_URL = API_URL.replace(/^http/, "ws") + "/ws";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  events: () => fetch(`${API_URL}/api/events`).then((r) => json<{ events: CozyEvent[] }>(r)),
  comments: (id: string) =>
    fetch(`${API_URL}/api/events/${encodeURIComponent(id)}/comments`).then((r) => json<{ comments: EventComment[] }>(r)),
  postComment: (id: string, author: string, body: string) =>
    fetch(`${API_URL}/api/events/${encodeURIComponent(id)}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ author, body }),
    }).then((r) => json<EventComment>(r)),
};
