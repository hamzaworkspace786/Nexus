"use client";

import { use } from "react";
// 1. Import LiveblocksProvider alongside RoomProvider
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense";
import { ClientSideSuspense } from "@liveblocks/react";
import { Canvas } from "@/app/components/Canvas";
import { LiveMap } from "@liveblocks/client"; // <-- NEW: Import LiveMap here

export default function WhiteboardPage({ params }: { params: Promise<{ id: string }> }) {

    const resolvedParams = use(params);
    const roomId = resolvedParams.id || "fallback-room";

    return (
        // 2. Wrap everything in LiveblocksProvider
        // REMOVED publicApiKey, ADDED authEndpoint to use your secure backend
        <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
            <RoomProvider
                id={roomId}
                // 3. Initialize the cursor state
                initialPresence={{ cursor: null }}
                // 4. Initialize the empty Liveblocks database for shapes
                initialStorage={{ shapes: new LiveMap() }}
            >
                <ClientSideSuspense fallback={
                    <div className="flex h-screen w-screen items-center justify-center bg-[#f8fafc]">
                        <div className="text-slate-500 font-bold">Connecting to Liveblocks...</div>
                    </div>
                }>
                    <Canvas roomId={roomId} />
                </ClientSideSuspense>
            </RoomProvider>
        </LiveblocksProvider>
    );
}