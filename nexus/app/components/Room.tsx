"use client";

import { ReactNode } from "react";
import {
    LiveblocksProvider,
    RoomProvider,
    ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { LiveMap } from "@liveblocks/client"; // <-- 1. Import LiveMap

export function Room({ children, roomId }: { children: ReactNode; roomId: string }) {
    return (
        <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
            <RoomProvider
                id={roomId}
                initialPresence={{ cursor: null }}
                initialStorage={{ shapes: new LiveMap() }} // <-- 2. Initialize the empty storage
            >
                <ClientSideSuspense
                    fallback={
                        <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-teal-400 font-bold">
                            Loading Whiteboard...
                        </div>
                    }
                >
                    {children}
                </ClientSideSuspense>
            </RoomProvider>
        </LiveblocksProvider>
    );
}