"use client";
import { motion, AnimatePresence } from "framer-motion";
import { LoaderFive } from "./loader";
import { useState, useEffect } from "react";

const sanskritFacts = [
	"Sanskrit is considered the 'mother of all languages' and is one of the oldest languages in the world, dating back over 3,500 years.",
	"The word 'Sanskrit' means 'refined' or 'perfected', reflecting its highly structured and systematic nature.",
	"Sanskrit has the largest vocabulary of any language, with over 100,000 words in its classical form.",
	"Panini's 'Ashtadhyayi', written around 500 BCE, is one of the most comprehensive grammar texts ever created for any language.",
	"Sanskrit is written in the Devanagari script, which is also used for Hindi, Marathi, and Nepali.",
	"Many modern Indian languages, including Hindi, Bengali, and Telugu, have evolved from Sanskrit.",
	"The Rigveda, composed in Sanskrit around 1500 BCE, is one of the oldest known texts in any Indo-European language.",
	"Sanskrit has 8 cases, 3 numbers, and 3 genders, making it one of the most grammatically complex languages.",
	"NASA has recognized Sanskrit as the most suitable language for computer programming due to its logical structure.",
	"Sanskrit literature includes epic poems like the Mahabharata (100,000 verses) and Ramayana (24,000 verses).",
	"The Sanskrit alphabet has 13 vowels and 33 consonants, each with a specific pronunciation.",
	"Sanskrit is still used as a ceremonial language in Hindu rituals and Buddhist chants.",
	"Many English words like 'yoga', 'karma', 'nirvana', 'mantra', and 'guru' are derived from Sanskrit.",
	"Sanskrit poetry follows strict metrical rules, with over 100 different meters (chandas) defined.",
	"The concept of zero (shunya) was first described in Sanskrit mathematical texts.",
	"Sanskrit has influenced languages as far as Indonesia, Cambodia, and Thailand through ancient trade routes.",
	"Classical Sanskrit is considered 'frozen' - it hasn't changed significantly in over 2,000 years.",
	"Sanskrit texts cover diverse subjects including mathematics, astronomy, medicine, philosophy, and politics.",
	"The Sanskrit word 'namaste' literally means 'I bow to you' and represents respect and greeting.",
	"Sanskrit's precise grammar allows for complex ideas to be expressed with remarkable clarity and brevity.",
];

export const LoadingScreen = ({
	text = "Loading Analysis...",
	loadingExit = false,
}: {
	text?: string;
	loadingExit?: boolean;
}) => {
	const [randomFact, setRandomFact] = useState(sanskritFacts[0]);

	useEffect(() => {
		// Select a random fact when component mounts
		const randomIndex = Math.floor(Math.random() * sanskritFacts.length);
		setRandomFact(sanskritFacts[randomIndex]);
	}, []);
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
						{/* Floating particles - use safe fallbacks for SSR (window is undefined on server) */}
						{[...Array(20)].map((_, i) => (
							<motion.div
								key={i}
								className="absolute w-2 h-2 bg-purple-400/20 rounded-full"
								initial={{
									x: typeof window !== "undefined" ? Math.random() * window.innerWidth : 0,
									y: typeof window !== "undefined" ? Math.random() * window.innerHeight : 0,
								}}
								animate={{
									x: typeof window !== "undefined" ? Math.random() * window.innerWidth : 0,
									y: typeof window !== "undefined" ? Math.random() * window.innerHeight : 0,
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
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5, delay: 0.4 }}
							>
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
							className="max-w-md mx-auto text-sm text-gray-600 dark:text-gray-400 px-4"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 1, duration: 0.5 }}
						>
							<motion.p
								key={randomFact}
								animate={{
									opacity: [0.5, 1, 0.5],
								}}
								transition={{
									duration: 3,
									repeat: Infinity,
									ease: "easeInOut",
								}}
								className="italic"
							>
								"{randomFact}"
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
