"use client";

import { useMedia } from "react-use";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { Button } from "../ui/button";
import { NavButton } from "./nav-button";
import { cn } from "@/lib/utils";

const routes = [
	{
		href: "/",
		label: "Home",
	},
	// {
	// 	href: "/shlokas",
	// 	label: "Shlokas",
	// },
	// {
	// 	href: "/addshloka",
	// 	label: "Add Shloka",
	// },
	{
		href: "/books",
		label: "E-Readers",
	},
	{
		href: "/addword",
		label: "Add Word",
	},
	{
		href: "/bookmarks",
		label: "Bookmarks",
	},
];

export const Navigation = () => {
	const [isOpened, setIsOpened] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false);

	const router = useRouter();
	const pathname = usePathname();
	const isMobile = useMedia("(max-width: 1024px)", false);

	useEffect(() => {
		const checkAdminStatus = async () => {
			const response = await fetch("/api/getCurrentUser");

			if (!response.ok) {
				console.error("Error fetching current user");
				return;
			}

			const data = await response.json();

			// Redirect if current user is not Admin or Root
			if (data.perms === "Root") {
				setIsAdmin(true); // Redirect to main page
			}
		};

		checkAdminStatus();
	}, []);

	const onClick = (href: string) => {
		router.push(href);
		setIsOpened(false);
	};

	if (isMobile) {
		return (
			<Sheet open={isOpened} onOpenChange={setIsOpened}>
				<SheetTrigger asChild>
					<Button variant="ghost" size="sm" className="hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all duration-300">
						<Menu className="size-5 text-gray-600 dark:text-gray-400" />
					</Button>
				</SheetTrigger>
				<SheetContent side="left" className="w-72 border-r border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-lg">
					<nav className="flex flex-col gap-y-2 pt-6">
						{routes.map((route) => (
							<Button
								key={route.href}
								variant="ghost"
								onClick={() => onClick(route.href)}
								className={cn(
									"w-full justify-start font-medium transition-all duration-300",
									"hover:bg-purple-100 dark:hover:bg-purple-900/30",
									"hover:text-purple-700 dark:hover:text-purple-300",
									pathname === route.href && "text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20"
								)}
							>
								{route.label}
							</Button>
						))}
						{isAdmin && (
							<Button
								variant="ghost"
								onClick={() => onClick("/admin")}
								className={cn(
									"w-full justify-start font-medium transition-all duration-300",
									"hover:bg-purple-100 dark:hover:bg-purple-900/30",
									"hover:text-purple-700 dark:hover:text-purple-300",
									pathname === "/admin" && "text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20"
								)}
							>
								Admin
							</Button>
						)}
					</nav>
				</SheetContent>
			</Sheet>
		);
	}
	return (
		<nav className="hidden lg:flex items-center gap-x-1">
			{routes.map((route) => (
				<NavButton key={route.href} href={route.href} label={route.label} isActive={pathname === route.href} />
			))}
			{isAdmin && <NavButton href="/admin" label="Admin" isActive={pathname === "/admin"} />}
		</nav>
	);
};
