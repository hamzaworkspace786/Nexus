import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { MongoClient } from "mongodb";

// No async/await needed! 
const client = new MongoClient(process.env.MONGODB_URI as string);
const db = client.db("whiteboard_app");

export const auth = betterAuth({
    // --- THIS IS THE FIX ---
    // Forces the server to use HTTP locally, preventing the SSL 80 error
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    // -----------------------

    database: mongodbAdapter(db),
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
    },
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        },
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }
    }
});