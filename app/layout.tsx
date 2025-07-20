import type { Metadata } from "next";
import "./styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { ThemeProvider } from "next-themes";

// Initialize Inter font
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "START",
	description: "CodeCache, a snippet manager for developers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<ClerkProvider>
			<html lang="en" suppressHydrationWarning>
				<body className={"min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-950 dark:to-gray-900 antialiased"}>
					<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
						<Providers>{children}</Providers>
					</ThemeProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}
