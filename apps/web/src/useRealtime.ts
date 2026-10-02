import { useEffect, useRef, useState } from "react";
import type { Avatar, ClientMessage, EventComment, ServerMessage } from "@cozy/shared";
import { WS_URL } from "./api";
import type { Identity } from "./identity";

interface Handlers {
  onComment(c: EventComment): void;
  onEventsUpdated(): void;
}

/** WebSocket presence + live updates with reconnect. */
export function useRealtime(identity: Identity, getPosition: () => { lng: number; lat: number }, handlers: Handlers) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let closed = false;
    let retry = 500;
    let timer: ReturnType<typeof setTimeout>;

    const connect = () => {
      const ws = new WebSocket(WS_URL);
      socketRef.current = ws;
      ws.onopen = () => {
        retry = 500;
        setConnected(true);
        const msg: ClientMessage = { t: "hello", ...identity, ...getPosition() };
        ws.send(JSON.stringify(msg));
      };
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data as string) as ServerMessage;
        if (msg.t === "welcome") setMe(msg.you);
        else if (msg.t === "presence") setAvatars(msg.avatars);
        else if (msg.t === "comment") handlersRef.current.onComment(msg.comment);
        else if (msg.t === "events-updated") handlersRef.current.onEventsUpdated();
      };
      ws.onclose = () => {
        setConnected(false);
        if (closed) return;
        timer = setTimeout(connect, retry);
        retry = Math.min(retry * 2, 10_000);
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      socketRef.current?.close();
    };
    // identity is stable for the session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMove = (lng: number, lat: number) => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: "move", lng, lat } satisfies ClientMessage));
  };

  return { avatars, me, connected, sendMove };
}
