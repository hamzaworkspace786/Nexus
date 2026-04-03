"use client";

import { use } from "react";
// 1. Import LiveblocksProvider alongside RoomProvider
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense";
import { ClientSideSuspense } from "@liveblocks/react";
import { Canvas } from "@/app/components/Canvas";

export default function WhiteboardPage({ params }: { params: Promise<{ id: string }> }) {

    const resolvedParams = use(params);
    const roomId = resolvedParams.id || "fallback-room";

    return (
        // 2. Wrap everything in LiveblocksProvider
        // Replace the publicApiKey with your actual Liveblocks Public Key from your dashboard
        // Or, if you set up an API route for auth, use: authEndpoint="/api/liveblocks-auth"
        <LiveblocksProvider publicApiKey="pk_dev_LHHZgCuoLaEM9Fszu__rHuDXTkC8TChTjQ0Jpogq4JX9301OKPQMNrhWYB3fNTD1">
            <RoomProvider
                id={roomId}
                initialPresence={{} as any}
                initialStorage={{} as any}
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