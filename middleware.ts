import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// List of paths that should be accessible during maintenance
const allowedPaths = [
	"/maintenance",
	"/api/", // This will allow all API routes
	"/",
	"/sign-in",
	"/sign-up",
	"/_next",
	"/favicon.ico",
];

export default clerkMiddleware((auth, request) => {
	// Check maintenance mode first
	if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true") {
		// If maintenance is enabled and not on maintenance page, redirect to maintenance
		if (request.nextUrl.pathname !== "/maintenance") {
			return NextResponse.redirect(new URL("/maintenance", request.url));
		}
	} else if (request.nextUrl.pathname === "/maintenance") {
		// If maintenance is disabled and on maintenance page, redirect to home
		return NextResponse.redirect(new URL("/", request.url));
	}

	// Then check if user is authenticated for any non-allowed path
	if (!allowedPaths.some((path) => request.nextUrl.pathname.startsWith(path)) && !auth().userId) {
		return NextResponse.redirect(new URL("/sign-up", request.url));
	}

	// Check if the current path is in the allowed paths
	if (allowedPaths.some((path) => request.nextUrl.pathname.startsWith(path))) {
		return NextResponse.next();
	}

	return NextResponse.next();
});

export const config = {
	matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
