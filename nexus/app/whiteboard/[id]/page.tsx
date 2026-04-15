"use client";

import { use, useState, useEffect, useCallback, useMemo } from "react";
import { RoomProvider } from "@liveblocks/react/suspense";
import { ClientSideSuspense } from "@liveblocks/react";
import { Canvas } from "@/app/components/Canvas";
import { LiveMap } from "@liveblocks/client";
import { getBoardByRoomId, updateBoardName } from "@/app/actions/boardActions";

export default function WhiteboardPage({ params }: { params: Promise<{ id: string }> }) {

    const resolvedParams = use(params);
    const roomId = resolvedParams.id || "fallback-room";

    const [boardName, setBoardName] = useState("Untitled Board");

    useEffect(() => {
        getBoardByRoomId(roomId).then((board) => {
            if (board?.name) {
                setBoardName(board.name);
            }
        });
    }, [roomId]);

    const handleBoardNameChange = useCallback(async (newName: string) => {
        setBoardName(newName);
        try {
            await updateBoardName(roomId, newName);
        } catch (error) {
            console.error("Failed to update board name:", error);
        }
    }, [roomId]);

    const initialPresence = useMemo(() => ({ cursor: null }), []);
    const initialStorage = useMemo(() => ({ shapes: new LiveMap() }), []);

    return (
        <RoomProvider
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
                    roomId={roomId}
                    boardName={boardName}
                    onBoardNameChange={handleBoardNameChange}
                />
            </ClientSideSuspense>
        </RoomProvider>
    );
}