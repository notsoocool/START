"use client";

import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { Navigation } from "./navigation";
import { HeaderLogo } from "./header-logo";

export const Header = () => {
	return (
		<header className="sticky top-0 left-0 right-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:px-14 z-50 transition-all duration-300">
			<div className="max-w-screen-2xl mx-auto">
				<div className="w-full flex items-center justify-between">
					<div className="flex items-center lg:gap-x-16">
						<HeaderLogo />
						<Navigation />
					</div>
					<div className="flex flex-row-reverse gap-6 items-center">
						<ClerkLoaded>
							<UserButton afterSignOutUrl="/" 
								appearance={{
									elements: {
										avatarBox: "w-9 h-9 rounded-full hover:ring-2 hover:ring-purple-500 transition-all duration-300"
									}
								}}
							/>
						</ClerkLoaded>
						<ClerkLoading>
							<Loader2 className="size-8 animate-spin text-purple-500" />
						</ClerkLoading>
					</div>
				</div>
			</div>
		</header>
	);
};
