"use client";

import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { Navigation } from "./navigation";
import { HeaderLogo } from "./header-logo";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "../ui/input";

export const Header = () => {
	return (
		<header className="sticky top-0 left-0 right-0 bg-transparent bg-opacity-20 backdrop-blur-md px-4 py-4 lg:px-14 z-50">
			<div className="max-w-screen-2xl mx-auto">
				<div className="w-full flex items-center justify-between">
					<div className="flex items-center lg:gap-x-16">
						<HeaderLogo />
						<Navigation />
					</div>
					{/* <div className="flex justify-center">
						<div className="relative w-full max-w-2xl">
							<Input
								type="text"
								placeholder="Search snippets..."
								className="pl-6 pr-4 py-2 w-full"
							/>
						</div>
					</div> */}
					<div className="flex flex-row-reverse gap-6 items-center">
						<ClerkLoaded>
							<UserButton />
						</ClerkLoaded>
						<ClerkLoading>
							<Loader2 className="size-8 animate-spin text-slate-400" />
						</ClerkLoading>
					</div>
				</div>
			</div>
		</header>
	);
};
