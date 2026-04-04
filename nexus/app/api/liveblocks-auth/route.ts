import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
// Adjust this import path to wherever your server-side auth file is!
import { auth } from "@/lib/auth";

// Initialize Liveblocks with your new dev key
const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(request: NextRequest) {
    // 1. Get the current user's session from Better Auth
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    // 2. If they aren't logged in, kick them out
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 403 });
    }

    const { user } = session;

    // 3. Create a profile for this user in the Liveblocks room
    // We can assign them a random cursor color based on their ID length or randomly
    const colors = ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#33FFF3"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // 4. Tell Liveblocks who this user is
    const liveblocksSession = liveblocks.prepareSession(
        user.id, // Their unique database ID
        {
            userInfo: {
                name: user.name,
                picture: user.image || `https://ui-avatars.com/api/?name=${user.name}&background=0D8B93&color=fff`,
                color: randomColor,
            },
        }
    );

    // 5. Give them access to the room they are trying to join
    try {
        const { room } = await request.json();

        // If there's a room requested, give them full access to it
        if (room) {
            liveblocksSession.allow(room, liveblocksSession.FULL_ACCESS);
        }
    } catch (e) {
        // If parsing fails, just authorize them globally (Liveblocks handles the rest)
        console.warn("No room specified in request body");
    }

    // 6. Return the authorization token to the frontend
    const { status, body } = await liveblocksSession.authorize();
    return new NextResponse(body, { status });
}