import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env");
}

// Cache the MongoClient just like we did with Mongoose!
let mongoClient: MongoClient;

if (process.env.NODE_ENV === "development") {
    let globalWithMongo = global as typeof globalThis & {
        _mongoClient?: MongoClient;
    };

    if (!globalWithMongo._mongoClient) {
        globalWithMongo._mongoClient = new MongoClient(MONGODB_URI);
    }
    mongoClient = globalWithMongo._mongoClient;
} else {
    mongoClient = new MongoClient(MONGODB_URI);
}

export const db = mongoClient.db("whiteboard_app");

export const auth = betterAuth({
    // Forces the server to use HTTP locally, preventing the SSL 80 error
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

    database: mongodbAdapter(db),
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }
    },
    user: {
        additionalFields: {
            bio: {
                type: "string",
                required: false,
                defaultValue: ""
            }
        }
    }
});