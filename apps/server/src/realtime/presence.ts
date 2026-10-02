import { randomUUID } from "node:crypto";
import { ClientMessageSchema, type Avatar, type ServerMessage } from "@cozy/shared";

export interface Peer {
  send(data: string): void;
}

const NEARBY_METERS = 150;

/** Rough distance in meters; fine at city scale. */
export function metersBetween(a: { lng: number; lat: number }, b: { lng: number; lat: number }): number {
  const kx = 111_320 * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.hypot((a.lng - b.lng) * kx, (a.lat - b.lat) * 110_540);
}

/**
 * In-memory presence for everyone on the map. MVP: one process, everyone
 * sees everyone, snapshots broadcast at a fixed tick when something moved.
 * Scaling path (docs/ARCHITECTURE.md): shard by map tile + Redis pub/sub.
 */
export class Presence {
  private avatars = new Map<string, Avatar>();
  private peers = new Map<string, Peer>();
  private dirty = false;

  connect(peer: Peer): string {
    const id = randomUUID();
    this.peers.set(id, peer);
    this.sendTo(peer, { t: "welcome", you: id });
    this.sendTo(peer, { t: "presence", avatars: [...this.avatars.values()] });
    return id;
  }

  disconnect(id: string) {
    this.peers.delete(id);
    if (this.avatars.delete(id)) this.dirty = true;
  }

  /** Returns false if the message was rejected. */
  handle(id: string, raw: string): boolean {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return false;
    }
    const parsed = ClientMessageSchema.safeParse(json);
    if (!parsed.success) return false;
    const msg = parsed.data;
    if (msg.t === "hello") {
      this.avatars.set(id, { id, handle: msg.handle, color: msg.color, lng: msg.lng, lat: msg.lat });
    } else {
      const a = this.avatars.get(id);
      if (!a) return false;
      a.lng = msg.lng;
      a.lat = msg.lat;
    }
    this.dirty = true;
    return true;
  }

  countNear(point: { lng: number; lat: number }): number {
    let n = 0;
    for (const a of this.avatars.values()) if (metersBetween(a, point) <= NEARBY_METERS) n++;
    return n;
  }

  /** Call on an interval. Broadcasts a snapshot if anything changed. */
  tick() {
    if (!this.dirty) return;
    this.dirty = false;
    this.broadcast({ t: "presence", avatars: [...this.avatars.values()] });
  }

  broadcast(msg: ServerMessage) {
    const data = JSON.stringify(msg);
    for (const p of this.peers.values()) p.send(data);
  }

  private sendTo(peer: Peer, msg: ServerMessage) {
    peer.send(JSON.stringify(msg));
  }
}
