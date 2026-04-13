import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    // 1. Check for Better Auth's default session cookies (works for both local HTTP and production HTTPS)
    const sessionCookie =
        request.cookies.get("better-auth.session_token") ||
        request.cookies.get("__Secure-better-auth.session_token");

    // 2. Define the exact base routes you want to lock down
    const protectedRoutes = ["/dashboard", "/whiteboard", "/settings"];

    // Check if the user is trying to visit any of those protected routes
    const isProtectedRoute = protectedRoutes.some((route) =>
        request.nextUrl.pathname.startsWith(route)
    );

    // 3. The Bouncer Logic: No cookie + Protected Route = Kick to Login
    if (isProtectedRoute && !sessionCookie) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // 4. Bonus Logic: If they ARE logged in, don't let them see the login/register pages anymore
    const authRoutes = ["/login", "/register"];
    const isAuthRoute = authRoutes.some((route) =>
        request.nextUrl.pathname.startsWith(route)
    );

    if (isAuthRoute && sessionCookie) {
        return NextResponse.redirect(new URL("/dashboard", request.url)); // Send them straight to dashboard
    }

    // 5. If everything is fine, let them pass
    return NextResponse.next();
}

// 6. The Matcher: Tells Next.js to only run this file on these specific paths (saves performance)
export const config = {
    matcher: [
        "/dashboard/:path*",
        "/whiteboard/:path*",
        "/settings/:path*",
        "/login",
        "/register"
    ],
};