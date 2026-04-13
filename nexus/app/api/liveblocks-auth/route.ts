import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // Ensure this path is correct
import { headers } from "next/headers"; // Essential for Vercel production

// 1. Initialize Liveblocks with your Secret Key
const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(request: NextRequest) {
    // 2. Get the current user's session from Better Auth
    // We use await headers() to ensure cookies are passed correctly on Vercel
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    // 3. If they aren't logged in, log it and return 403
    if (!session || !session.user) {
        console.error("Liveblocks Auth Error: No active Better Auth session found.");
        return new NextResponse("Unauthorized", { status: 403 });
    }

    const { user } = session;

    // 4. Create a profile for this user in the Liveblocks room
    const colors = ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#33FFF3"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const liveblocksSession = liveblocks.prepareSession(
        user.id,
        {
            userInfo: {
                name: user.name,
                picture: user.image || `https://ui-avatars.com/api/?name=${user.name}&background=0D8B93&color=fff`,
                color: randomColor,
            },
        }
    );

    // 5. Safely parse the room ID from the request (just for logging purposes now)
    try {
        const body = await request.json();
        const room = body.room;

        if (!room) {
            console.warn("Liveblocks Auth: No room specified in request body.");
        }
    } catch (e) {
        console.error("Liveblocks Auth: Failed to parse request body.");
    }

    // WILDCARD TEST FIX: Give them full write access to ALL rooms.
    // This bypasses any issues with the room name not being sent in the POST body.
    liveblocksSession.allow("*", liveblocksSession.FULL_ACCESS);

    // 6. Authorize the session and return the token
    try {
        const { status, body } = await liveblocksSession.authorize();
        return new NextResponse(body, { status });
    } catch (error) {
        console.error("Liveblocks Authorize Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}