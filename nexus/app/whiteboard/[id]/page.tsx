"use client";

import { use, useState, useEffect, useCallback, useMemo } from "react";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense";
import { ClientSideSuspense } from "@liveblocks/react";
import { Canvas } from "@/app/components/Canvas";
import { LiveMap } from "@liveblocks/client";
import { getBoardByRoomId, updateBoardName } from "@/app/actions/boardActions";

export default function WhiteboardPage({ params }: { params: Promise<{ id: string }> }) {

    const resolvedParams = use(params);
    const roomId = resolvedParams.id || "fallback-room";

    const [boardName, setBoardName] = useState("Untitled Board");

    // Fetch the board name from MongoDB on mount
    useEffect(() => {
        getBoardByRoomId(roomId).then((board) => {
            if (board?.name) {
                setBoardName(board.name);
            }
        });
    }, [roomId]);

    // Handler to rename the board and persist to DB
    const handleBoardNameChange = useCallback(async (newName: string) => {
        setBoardName(newName); // Optimistic update
        try {
            await updateBoardName(roomId, newName);
        } catch (error) {
            console.error("Failed to update board name:", error);
        }
    }, [roomId]);

    // Memoize initialPresence and initialStorage to prevent RoomProvider from reconnecting on re-render
    // Reconnecting clears the Canvas and destroys the Tldraw store
    const initialPresence = useMemo(() => ({ cursor: null }), []);
    const initialStorage = useMemo(() => ({ shapes: new LiveMap() }), []);

    return (
        <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
            <RoomProvider
                key={roomId}
                id={roomId}
                initialPresence={initialPresence as any}
                initialStorage={initialStorage as any}
            >
                <ClientSideSuspense fallback={
                    <div className="flex h-screen w-screen items-center justify-center bg-[#f8fafc]">
                        <div className="text-slate-500 font-bold">Connecting to Liveblocks...</div>
                    </div>
                }>
                    <Canvas
                        key={`canvas-${roomId}`}
                        roomId={roomId}
                        boardName={boardName}
                        onBoardNameChange={handleBoardNameChange}
                    />
                </ClientSideSuspense>
            </RoomProvider>
        </LiveblocksProvider>
    );
}