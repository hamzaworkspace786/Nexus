// /actions/boardActions.ts
"use server";

import { Board } from "@/app/models/Board";
import { auth } from "@/lib/auth"; // Adjust this path to your Better Auth config
import { headers } from "next/headers";
// Import your MongoDB connection function (adjust path as needed)
import { connectToDatabase } from "@/lib/db";

export async function createBoardInDb(roomId: string) {
    try {
        // 1. Connect to MongoDB
        await connectToDatabase();

        // 2. Secure the action: Get the logged-in user
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session || !session.user) {
            throw new Error("Unauthorized: You must be logged in to create a board.");
        }

        // 3. Save the room to the database
        const newBoard = await Board.create({
            roomId: roomId,
            name: "New Workspace", // You can let users customize this later!
            ownerId: session.user.id,
        });

        // We stringify and parse to avoid Next.js "plain object" warnings
        return JSON.parse(JSON.stringify(newBoard));

    } catch (error) {
        console.error("Error creating board in DB:", error);
        throw new Error("Failed to create board");
    }
}