"use client";

import { SignUp, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
	const { isSignedIn } = useUser();
	const router = useRouter();

	useEffect(() => {
		if (isSignedIn) {
			router.replace("/");
		}
	}, [isSignedIn, router]);

	if (isSignedIn) return null;

	return (
		<div className="flex justify-center py-24">
			<SignUp path="/sign-up" />
		</div>
	);
}
