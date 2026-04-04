// /models/Board.ts
import mongoose from "mongoose";

const boardSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        default: "Untitled Board"
    },
    ownerId: {
        type: String,
        required: true // This will store the Better Auth User ID
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

// This prevents Mongoose from recompiling the model if it already exists
export const Board = mongoose.models.Board || mongoose.model("Board", boardSchema);