// /actions/boardActions.ts
"use server";

import { Board } from "@/app/models/Board";
import { auth } from "@/lib/auth"; // Adjust this path to your Better Auth config
import { headers } from "next/headers";
// Import your MongoDB connection function (adjust path as needed)
import { connectToDatabase } from "@/lib/db";

export async function createBoard(name: string) {
    try {
        await connectToDatabase();

        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session || !session.user) {
            throw new Error("Unauthorized: You must be logged in to create a board.");
        }

        // Generate a unique roomId for Liveblocks
        const roomId = Math.random().toString(36).substring(2, 11);

        const newBoard = await Board.create({
            roomId: roomId,
            name: name || "Untitled Board",
            ownerId: session.user.id,
        });

        return JSON.parse(JSON.stringify(newBoard));
    } catch (error) {
        console.error("Error creating board:", error);
        throw new Error("Failed to create board");
    }
}

export async function getBoardByRoomId(roomId: string) {
    try {
        await connectToDatabase();

        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session || !session.user) {
            throw new Error("Unauthorized");
        }

        const board = await Board.findOne({ roomId });

        if (!board) return null;

        return JSON.parse(JSON.stringify(board));
    } catch (error) {
        console.error("Error fetching board:", error);
        return null;
    }
}

export async function updateBoardName(id: string, name: string) {
    try {
        await connectToDatabase();

        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session || !session.user) {
            throw new Error("Unauthorized");
        }

        const updatedBoard = await Board.findOneAndUpdate(
            { 
                $or: [{ _id: id }, { roomId: id }], 
                ownerId: session.user.id 
            },
            { name: name.trim() || "Untitled Board" },
            { new: true }
        );

        if (!updatedBoard) {
            throw new Error("Board not found or you don't have permission to rename it.");
        }

        return JSON.parse(JSON.stringify(updatedBoard));
    } catch (error) {
        console.error("Error updating board name:", error);
        throw new Error("Failed to update board name");
    }
}

export async function deleteBoard(id: string) {
    try {
        await connectToDatabase();

        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session || !session.user) {
            throw new Error("Unauthorized");
        }

        const deletedBoard = await Board.findOneAndDelete({
            _id: id,
            ownerId: session.user.id
        });

        if (!deletedBoard) {
            throw new Error("Board not found or you don't have permission to delete it.");
        }

        return { success: true };
    } catch (error) {
        console.error("Error deleting board:", error);
        throw new Error("Failed to delete board");
    }
}

export async function getBoards() {
    try {
        await connectToDatabase();

        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session || !session.user) {
            throw new Error("Unauthorized");
        }

        const boards = await Board.find({ ownerId: session.user.id })
            .sort({ createdAt: -1 }) // Newest first
            .lean();

        return JSON.parse(JSON.stringify(boards));
    } catch (error) {
        console.error("Error fetching user boards:", error);
        return [];
    }
}