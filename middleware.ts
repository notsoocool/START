import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// List of paths that should be accessible without authentication
const publicPaths = ["/sign-in", "/sign-up", "/api/", "/_next", "/favicon.ico"];

export default clerkMiddleware((auth, request) => {
	// Check maintenance mode
	if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true") {
		if (request.nextUrl.pathname !== "/maintenance") {
			return NextResponse.redirect(new URL("/maintenance", request.url));
		}
	} else if (request.nextUrl.pathname === "/maintenance") {
		return NextResponse.redirect(new URL("/", request.url));
	}

	// Check if path is public
	if (publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))) {
		return NextResponse.next();
	}

	// Allow access to home page without authentication
	if (request.nextUrl.pathname === "/") {
		return NextResponse.next();
	}

	// Check authentication for all other paths
	if (!auth().userId) {
		return NextResponse.redirect(new URL("/sign-up", request.url));
	}

	return NextResponse.next();
});

export const config = {
	matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
