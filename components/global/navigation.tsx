"use client";

import { useMedia } from "react-use";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { Button } from "../ui/button";
import { NavButton } from "./nav-button";

const routes = [
	{
		href: "/",
		label: "Home",
	},
	// {
	// 	href: "/shlokas",
	// 	label: "Shlokas",
	// },
	{
		href: "/addshloka",
		label: "Add Shloka",
	},
	{
		href: "/books",
		label: "Sacred Books",
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
			if (data.perms === "Admin" || data.perms === "Root") {
				setIsAdmin(true) // Redirect to main page
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
					<Button
						variant="outline"
						size="sm"
						className="font-normal bg-foreground/10 hover:bg-foreground/20 hover:text-foreground border-none focus-visible:ring-offset-0 focus-visible:ring-transparent outline-none text-foreground focus:bg-foreground/30 transition"
					>
						<Menu className="size-4" />
					</Button>
				</SheetTrigger>
				<SheetContent side="left" className="px-2">
					<nav className="flex flex-col gap-y-2 pt-6">
						{routes.map((route) => (
							<Button
								key={route.href}
								variant={
									route.href === pathname
										? "secondary"
										: "ghost"
								}
								onClick={() => onClick(route.href)}
								className="w-full justify-start"
							>
								{route.label}
							</Button>
						))}
						{isAdmin && (
							<Button
								variant={
									pathname === "/admin" ? "secondary" : "ghost"
								}
								onClick={() => onClick("/admin")}
								className="w-full justify-start"
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
		<nav className=" hidden lg:flex items-center gap-x-2 overflow-x-auto">
			{routes.map((route) => (
				<NavButton
					key={route.href}
					href={route.href}
					label={route.label}
					isActive={pathname === route.href}
				/>
			))}
			{isAdmin && (
				<NavButton
					href="/admin"
					label="Admin"
					isActive={pathname === "/admin"}
				/>
			)}
		</nav>
	);
};
