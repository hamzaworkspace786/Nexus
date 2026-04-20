import { auth, db } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, bio } = await req.json();

    try {
        console.log("Updating profile for user ID:", session.user.id);
        
        let query: any = { id: session.user.id };
        
        // MongoDB uses _id (ObjectId) by default. Let's try to convert the ID.
        try {
            query = { _id: new ObjectId(session.user.id) };
        } catch (e) {
            console.log("Not a valid ObjectId, falling back to string 'id' field");
        }

        const result = await db.collection("user").updateOne(
            query,
            { 
                $set: { 
                    name: name || session.user.name, 
                    bio: bio || "" 
                } 
            }
        );

        console.log("Update result:", result);

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "User not found in database" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Profile update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
