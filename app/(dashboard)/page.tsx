"use client";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
	Loader,
	BookOpen,
	Layers,
	Languages,
	Search,
	MessageSquare,
	Bookmark,
	PenSquare,
	GitBranch,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { WavyBackground } from "@/components/ui/wavy-background";
import { FlipWords } from "@/components/ui/flip-words";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

const ErrorDisplay = dynamic(
	() => import("@/components/global/ErrorDisplay").then((m) => ({ default: m.ErrorDisplay })),
	{ ssr: true }
);

interface User {
	id: string;
	firstName: string;
	lastName: string;
	perms: "User" | "Annotator" | "Editor" | "Admin" | "Root";
}

const MainPage = () => {
	const { user, isLoaded } = useUser();
	const { resolvedTheme } = useTheme();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (isLoaded) {
			setLoading(false);
		}
	}, [isLoaded]);

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
				<Loader className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
				<p className="text-gray-600 dark:text-gray-300 text-lg animate-pulse">Loading your experience...</p>
			</div>
		);
	}

	if (error) {
		return (
			<ErrorDisplay
				error={{
					type: "LOADING_ERROR",
					message: error,
				}}
			/>
		);
	}

	return (
		<div className="py-8 px-4">
			{/* Hero Section - WavyBackground */}
			<section className="relative min-h-[85vh] overflow-hidden rounded-2xl">
				<WavyBackground
					containerClassName="absolute inset-0 min-h-[85vh]"
					className="w-full px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
					backgroundFill={resolvedTheme === "dark" ? "rgb(3 7 18)" : "rgb(248 250 252)"}
					colors={["#38bdf8", "#818cf8", "#c084fc", "#e879f9", "#22d3ee"]}
					waveOpacity={0.5}
				>
					<div className="container mx-auto max-w-4xl text-left">
						<a
							href="/books"
							className={`mb-8 inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm backdrop-blur-sm transition-colors ${
								resolvedTheme === "dark"
									? "border border-white/30 bg-white/10 text-white/90 hover:border-white/50 hover:bg-white/20"
									: "border border-gray-300 bg-white/80 text-gray-700 hover:border-purple-300 hover:bg-white"
							}`}
						>
							Explore 1000+ shlokas with word-by-word analysis →
						</a>

						<h1
							className={`max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl ${
								resolvedTheme === "dark" ? "text-white" : "text-gray-900"
							}`}
						>
							Unlock the{" "}
							<FlipWords
								words={["wisdom", "beauty", "depth", "knowledge"]}
								duration={3000}
								className={resolvedTheme === "dark" ? "text-white" : "text-gray-900"}
							/>
							<br />
							of Sanskrit literature in minutes.
						</h1>
						<p
							className={`mt-6 max-w-2xl text-lg sm:text-xl leading-relaxed ${
								resolvedTheme === "dark" ? "text-white/80" : "text-gray-600"
							}`}
						>
							Our platform brings you structured morphological analysis, multiple language meanings, and interactive learning—so you can understand every word instead of memorizing verses.
						</p>

						<div className="mt-10 flex flex-wrap gap-4">
							<Link href="/books">
								<Button
									size="lg"
									className={resolvedTheme === "dark" ? "bg-white text-gray-900 hover:bg-gray-100" : "bg-gray-900 text-white hover:bg-gray-800"}
								>
									Start Learning →
								</Button>
							</Link>
							<Link href="/about">
								<Button
									size="lg"
									variant="outline"
									className={resolvedTheme === "dark" ? "border-white/50 text-white hover:bg-white/10" : "border-gray-300 text-gray-900 hover:bg-gray-100"}
								>
									Learn More
								</Button>
							</Link>
						</div>
					</div>
				</WavyBackground>
			</section>

			{/* Hero images - light/dark mode */}
			<section className="relative -mt-4 overflow-hidden rounded-2xl px-4">
				<div className="container mx-auto max-w-4xl">
					<img
						src="/images/hero-light.png"
						alt=""
						aria-hidden
						className="w-full rounded-xl object-cover dark:hidden"
					/>
					<img
						src="/images/hero-dark.png"
						alt=""
						aria-hidden
						className="hidden w-full rounded-xl object-cover dark:block"
					/>
				</div>
			</section>

			{/* Our Mission Section */}
			<section className="overflow-hidden rounded-2xl py-24 px-4 sm:px-6 lg:px-8">
				<HeroHighlight containerClassName="min-h-[24rem] rounded-2xl">
					<div className="mx-auto max-w-4xl px-4 text-center">
						<motion.h2
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: [20, -5, 0] }}
							transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
							className="mb-8 text-3xl font-bold text-neutral-700 dark:text-white md:text-4xl lg:text-5xl"
						>
							Our Mission
						</motion.h2>
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: [20, -5, 0] }}
							transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
							className="text-lg leading-relaxed text-neutral-600 dark:text-neutral-300 md:text-xl"
						>
							Our platform aims to make Sanskrit knowledge{" "}
							<Highlight className="text-black dark:text-white">
								accessible to everyone
							</Highlight>
							. We provide a structured and interactive way to learn Sanskrit shlokas, understand their meanings, and appreciate their significance.
						</motion.p>
					</div>
				</HeroHighlight>
			</section>

			{/* Features Section */}
			<section className="py-24 px-4 sm:px-6 lg:px-8">
				<div className="container mx-auto">
					<h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-16 text-center">Key Features</h2>
					<FeaturesGrid />
				</div>
			</section>

			{/* Team Section */}
			{/* <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
				<div className="container mx-auto text-center">
					<h2 className="text-4xl font-bold text-gray-900 mb-12">Meet Our Team</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
						<TeamMember name="Yajush Vyas" role="Software Developer" description="Full-stack developer passionate about making Sanskrit knowledge accessible." />
						<TeamMember name="Dr. [Name]" role="Sanskrit Scholar" description="Expert in Sanskrit literature and scriptural interpretations." />
						<TeamMember name="[Name]" role="Content Curator" description="Ensuring quality and authenticity of shloka interpretations." />
					</div>
				</div>
			</section> */}
		</div>
	);
};

// Features Grid - project features with hover effects
const FEATURES = [
	{
		title: "Comprehensive Shloka Database",
		description: "Access a vast collection of Sanskrit shlokas from different scriptures and texts.",
		icon: <BookOpen className="h-8 w-8" />,
	},
	{
		title: "Word-by-word Morphological Analysis",
		description: "Structured analysis with sandhi, morph, anvaya, and prose order for every word.",
		icon: <Layers className="h-8 w-8" />,
	},
	{
		title: "Multiple Language Meanings",
		description: "Meanings in Hindi, English, Tamil, Telugu, and more—add new languages via admin.",
		icon: <Languages className="h-8 w-8" />,
	},
	{
		title: "In-depth Analysis & Interpretations",
		description: "Kaaraka relations, possible relations, and detailed context for every shloka.",
		icon: <Search className="h-8 w-8" />,
	},
	{
		title: "Discussions & Community",
		description: "Discuss shlokas, share insights, and engage with a community of Sanskrit learners.",
		icon: <MessageSquare className="h-8 w-8" />,
	},
	{
		title: "Bookmarking",
		description: "Save your favorite shlokas and chapters for quick access and study.",
		icon: <Bookmark className="h-8 w-8" />,
	},
	{
		title: "Add & Edit Content",
		description: "Contributors can add new shlokas, edit analysis, and manage word-level data.",
		icon: <PenSquare className="h-8 w-8" />,
	},
	{
		title: "Graph Visualization",
		description: "Visual dependency graphs for sentence structure and word relations.",
		icon: <GitBranch className="h-8 w-8" />,
	},
];

function FeaturesGrid() {
	return (
		<div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 py-10 md:grid-cols-2 lg:grid-cols-4">
			{FEATURES.map((feature, index) => (
				<FeatureCard key={feature.title} {...feature} index={index} />
			))}
		</div>
	);
}

function FeatureCard({
	title,
	description,
	icon,
	index,
}: {
	title: string;
	description: string;
	icon: React.ReactNode;
	index: number;
}) {
	return (
		<div
			className={cn(
				"group/feature relative flex flex-col py-10 lg:border-r dark:border-neutral-800",
				(index === 0 || index === 4) && "lg:border-l dark:border-neutral-800",
				index < 4 && "lg:border-b dark:border-neutral-800"
			)}
		>
			{index < 4 && (
				<div className="pointer-events-none absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-100 to-transparent opacity-0 transition duration-200 group-hover/feature:opacity-100 dark:from-neutral-800" />
			)}
			{index >= 4 && (
				<div className="pointer-events-none absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-100 to-transparent opacity-0 transition duration-200 group-hover/feature:opacity-100 dark:from-neutral-800" />
			)}
			<div className="relative z-10 mb-4 px-10 text-neutral-600 dark:text-neutral-400">{icon}</div>
			<div className="relative z-10 mb-2 px-10 text-lg font-bold">
				<div className="absolute inset-y-0 left-0 h-6 w-1 origin-center rounded-br-full rounded-tr-full bg-neutral-300 transition-all duration-200 group-hover/feature:h-8 group-hover/feature:bg-blue-500 dark:bg-neutral-700" />
				<span className="relative inline-block text-neutral-800 transition duration-200 group-hover/feature:translate-x-2 dark:text-neutral-100">
					{title}
				</span>
			</div>
			<p className="relative z-10 max-w-xs px-10 text-sm text-neutral-600 dark:text-neutral-300">{description}</p>
		</div>
	);
}

// Team Member Component
function TeamMember({ name, role, description }: { name: string; role: string; description: string }) {
	return (
		<div className="bg-white dark:bg-gray-900/80 p-6 rounded-lg shadow-lg text-center border border-gray-100 dark:border-gray-800">
			<h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{name}</h3>
			<p className="text-purple-600 dark:text-purple-400 text-lg font-semibold">{role}</p>
			<p className="text-gray-600 dark:text-gray-300 mt-2">{description}</p>
		</div>
	);
}

export default MainPage;
