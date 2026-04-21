// liveblocks.config.ts
import { LiveMap, LiveObject } from "@liveblocks/client";

export type Presence = {
    cursor: { x: number; y: number } | null;
};

export type Shape = LiveObject<{
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    type: "rectangle" | "ellipse";
}>;

export type Storage = {
    shapes: LiveMap<string, Shape>;
};

export type UserMeta = {
    id: string;
    info: {
        name: string;
        picture: string;
        color: string;
    };
};

// Plain JSON-serializable SDP & ICE types (Liveblocks rejects browser interfaces)
export type JsonSdp = { type?: string; sdp?: string };
export type JsonIceCandidate = {
    candidate?: string; sdpMid?: string | null;
    sdpMLineIndex?: number | null; usernameFragment?: string | null;
};

export type RoomEvent =
    | { type: "reaction"; emoji: string }
    // ── Voice signaling ──────────────────────────────────
    | { type: "voice:join"; userId: string; userName: string; userColor: string; userImage: string }
    | { type: "voice:leave"; userId: string }
    | { type: "voice:already-here"; userId: string; userName: string; userColor: string; userImage: string; isMuted: boolean }
    | { type: "voice:mute-state"; userId: string; isMuted: boolean }
    | { type: "voice:speaking"; userId: string; isSpeaking: boolean }
    // WebRTC handshake (plain JSON, not browser interfaces)
    | { type: "voice:offer"; fromId: string; toId: string; sdp: JsonSdp }
    | { type: "voice:answer"; fromId: string; toId: string; sdp: JsonSdp }
    | { type: "voice:ice-candidate"; fromId: string; toId: string; candidate: JsonIceCandidate };

export type ThreadMetadata = {
    resolved: boolean;
    x: number;
    y: number;
};

declare global {
    interface Liveblocks {
        Presence: Presence;
        Storage: Storage;
        UserMeta: UserMeta;
        RoomEvent: RoomEvent;
        ThreadMetadata: ThreadMetadata;
    }
}

export { };