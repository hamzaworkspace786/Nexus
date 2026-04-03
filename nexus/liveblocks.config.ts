// liveblocks.config.ts
import { LiveMap, LiveObject } from "@liveblocks/client";

// 1. PRESENCE: What are users doing right now?
export type Presence = {
    // null means their mouse is off the canvas
    cursor: { x: number; y: number } | null;
};

// 2. STORAGE: What is permanently saved on the whiteboard?
// We will use a LiveMap to store shapes. A LiveMap is like a JavaScript Object/Dictionary 
// but it automatically syncs across all users without conflicts.
export type Shape = LiveObject<{
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    type: "rectangle" | "ellipse"; // We can add more later!
}>;

export type Storage = {
    // A map of Shape ID strings pointing to actual Shape objects
    shapes: LiveMap<string, Shape>;
};

// 3. USER META: Who is this user? 
// Notice how this exactly matches the `userInfo` object we created in your API route yesterday!
export type UserMeta = {
    id: string;
    info: {
        name: string;
        picture: string;
        color: string;
    };
};

// 4. ROOM EVENTS: Custom bursts of data (like sending a quick emoji reaction)
export type RoomEvent = {
    type: "reaction";
    emoji: string;
};

// 5. THREAD METADATA: Required if you ever want to add comment threads to your canvas
export type ThreadMetadata = {
    resolved: boolean;
    x: number;
    y: number;
};

// ============================================================================
// GLOBAL TYPE AUGMENTATION
// This is the magic part. It tells every Liveblocks React hook in your app 
// to automatically use the types we just defined above!
// ============================================================================
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