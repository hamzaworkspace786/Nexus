"use client";

import { use, useState, useEffect, useCallback } from "react";
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

    return (
        <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
            <RoomProvider
                id={roomId}
                initialPresence={{ cursor: null }}
                initialStorage={{ shapes: new LiveMap() }}
            >
                <ClientSideSuspense fallback={
                    <div className="flex h-screen w-screen items-center justify-center bg-[#f8fafc]">
                        <div className="text-slate-500 font-bold">Connecting to Liveblocks...</div>
                    </div>
                }>
                    <Canvas
                        roomId={roomId}
                        boardName={boardName}
                        onBoardNameChange={handleBoardNameChange}
                    />
                </ClientSideSuspense>
            </RoomProvider>
        </LiveblocksProvider>
    );
}