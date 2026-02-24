"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute

export function PresenceHeartbeat() {
	const { isSignedIn } = useAuth();
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (!isSignedIn) return;

		const sendHeartbeat = () => {
			fetch("/api/presence/heartbeat", { method: "POST" }).catch(() => {});
		};

		// Send immediately on mount
		sendHeartbeat();

		// Then every minute
		intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [isSignedIn]);

	return null;
}
