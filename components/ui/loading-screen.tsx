"use client";
import { motion, AnimatePresence } from "framer-motion";
import { LoaderFive } from "./loader";

export const LoadingScreen = ({ text = "Loading Analysis...", loadingExit = false }: { text?: string; loadingExit?: boolean }) => {
	return (
		<AnimatePresence mode="wait">
			{!loadingExit && (
				<motion.div
					key="loading-screen"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.5, ease: "easeInOut" }}
					className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-950 dark:to-gray-900"
				>
					{/* Background animated elements */}
					<div className="absolute inset-0 overflow-hidden">
						{/* Floating particles */}
						{[...Array(20)].map((_, i) => (
							<motion.div
								key={i}
								className="absolute w-2 h-2 bg-purple-400/20 rounded-full"
								initial={{
									x: Math.random() * window.innerWidth,
									y: Math.random() * window.innerHeight,
								}}
								animate={{
									x: Math.random() * window.innerWidth,
									y: Math.random() * window.innerHeight,
								}}
								transition={{
									duration: 8 + Math.random() * 4,
									repeat: Infinity,
									repeatType: "reverse",
									ease: "easeInOut",
								}}
							/>
						))}

						{/* Sanskrit symbols floating */}
						<motion.div
							className="absolute top-1/4 left-1/4 text-6xl text-purple-300/30 dark:text-purple-600/30"
							animate={{
								rotate: [0, 360],
								scale: [1, 1.1, 1],
							}}
							transition={{
								duration: 10,
								repeat: Infinity,
								ease: "linear",
							}}
						>
							ॐ
						</motion.div>

						<motion.div
							className="absolute top-3/4 right-1/4 text-4xl text-blue-300/30 dark:text-blue-600/30"
							animate={{
								rotate: [360, 0],
								scale: [1, 1.2, 1],
							}}
							transition={{
								duration: 8,
								repeat: Infinity,
								ease: "linear",
							}}
						>
							॥
						</motion.div>
					</div>

					{/* Main loading content */}
					<motion.div
						className="relative z-10 text-center space-y-8"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						transition={{ duration: 0.6, delay: 0.2 }}
					>
						{/* Animated book icon */}
						<motion.div
							className="mx-auto w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg shadow-2xl flex items-center justify-center"
							animate={{
								y: [0, -10, 0],
								rotateY: [0, 180, 360],
							}}
							transition={{
								duration: 3,
								repeat: Infinity,
								ease: "easeInOut",
							}}
						>
							<motion.div
								className="text-white text-3xl"
								animate={{
									scale: [1, 1.2, 1],
								}}
								transition={{
									duration: 2,
									repeat: Infinity,
									ease: "easeInOut",
								}}
							>
								📖
							</motion.div>
						</motion.div>

						{/* Loading text with animation */}
						<div className="space-y-4">
							<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
								<LoaderFive text={text} />
							</motion.div>

							{/* Progress dots */}
							<motion.div
								className="flex justify-center space-x-2"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.6, duration: 0.5 }}
							>
								{[...Array(3)].map((_, i) => (
									<motion.div
										key={i}
										className="w-3 h-3 bg-purple-500 rounded-full"
										animate={{
											scale: [1, 1.5, 1],
											opacity: [0.5, 1, 0.5],
										}}
										transition={{
											duration: 1.5,
											repeat: Infinity,
											delay: i * 0.2,
											ease: "easeInOut",
										}}
									/>
								))}
							</motion.div>
						</div>

						{/* Fun facts or tips */}
						<motion.div
							className="max-w-md mx-auto text-sm text-gray-600 dark:text-gray-400"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 1, duration: 0.5 }}
						>
							<motion.p
								animate={{
									opacity: [0.5, 1, 0.5],
								}}
								transition={{
									duration: 3,
									repeat: Infinity,
									ease: "easeInOut",
								}}
							>
								"Sanskrit is the language of the gods, containing the wisdom of millennia..."
							</motion.p>
						</motion.div>
					</motion.div>

					{/* Bottom wave effect */}
					<motion.div
						className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-purple-500/10 to-transparent"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.8, duration: 0.5 }}
					/>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
