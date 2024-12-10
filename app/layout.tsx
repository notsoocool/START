import type { Metadata } from "next";
import "./styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";

// Initialize Inter font
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "START",
	description: "CodeCache, a snippet manager for developers.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider>
			<html lang="en" className={inter.className}>
				<body className="antialiased bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
					{children}
				</body>
			</html>
		</ClerkProvider>
	);
}
