"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export const PageLoader = () => {
	const [isLoadingSession, setIsLoadingSession] = useState(false);
	const [targetPath, setTargetPath] = useState<string | null>(null);
	const pathname = usePathname();

	// Start loading session on navigation
	useEffect(() => {
		const handleLinkClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			const link = target.closest("a, button[data-navigate]");
			if (link) {
				const href = link.getAttribute("href");
				if (href && href.startsWith("/") && !href.startsWith("/#")) {
					setIsLoadingSession(true);
					setTargetPath(href);
				}
			}
		};
		document.addEventListener("click", handleLinkClick);
		return () => document.removeEventListener("click", handleLinkClick);
	}, []);

	// End loading session when route changes
	useEffect(() => {
		if (isLoadingSession && targetPath && pathname === targetPath) {
			setIsLoadingSession(false);
			setTargetPath(null);
		}
	}, [pathname, isLoadingSession, targetPath]);

	const showLoader = isLoadingSession;

	return (
		<AnimatePresence>
			{showLoader && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
					className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/90 dark:bg-gray-950/90 backdrop-blur-md"
				>
					<motion.div
						initial={{ scale: 0.8, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.8, opacity: 0 }}
						transition={{ duration: 0.3, delay: 0.1 }}
						className="flex flex-col items-center space-y-6 p-8"
					>
						{/* Double spinner animation */}
						<div className="relative">
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
								className="w-16 h-16 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 rounded-full"
							/>
							<motion.div
								animate={{ rotate: -360 }}
								transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
								className="absolute inset-3 w-10 h-10 border-2 border-blue-200 dark:border-blue-800 border-b-blue-500 dark:border-b-blue-400 rounded-full"
							/>
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
								className="absolute inset-6 w-4 h-4 border border-gray-300 dark:border-gray-600 border-r-gray-600 dark:border-r-gray-300 rounded-full"
							/>
						</div>
						{/* Loading text with pulse animation */}
						<motion.div
							initial={{ y: 20, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							transition={{ duration: 0.4, delay: 0.2 }}
							className="text-center space-y-2"
						>
							<motion.h3
								animate={{ opacity: [1, 0.7, 1] }}
								transition={{ duration: 1.5, repeat: Infinity }}
								className="text-xl font-semibold text-gray-800 dark:text-gray-200"
							>
								Loading
							</motion.h3>
							<p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">Preparing your content, this will only take a moment...</p>
						</motion.div>
						{/* Progress bar animation */}
						<div className="w-48 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
							<motion.div
								initial={{ x: "-100%" }}
								animate={{ x: "100%" }}
								transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
								className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
							/>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
