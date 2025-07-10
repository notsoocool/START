"use client";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorDisplay } from "@/components/global/ErrorDisplay";
import { useUser } from "@clerk/nextjs";

interface User {
	id: string;
	firstName: string;
	lastName: string;
	perms: "User" | "Annotator" | "Editor" | "Admin" | "Root";
}

const MainPage = () => {
	const { user, isLoaded } = useUser();
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
				<Loader className="w-8 h-8 animate-spin text-purple-600" />
				<p className="text-gray-600 text-lg animate-pulse">Loading your experience...</p>
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
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
			{/* Hero Section */}
			<section className="py-32 px-4 sm:px-6 lg:px-8 text-center">
				<div className="container mx-auto">
					<h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
						Unlock the Wisdom of Sanskrit Literature
					</h1>
					<p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
						Explore thousands of shlokas with their meanings, interpretations, and applications in modern life.
					</p>
					<Link href="/books">
						<Button
							size="lg"
							className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
						>
							Start Learning
						</Button>
					</Link>
				</div>
			</section>

			{/* About Us Section */}
			<section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
				<div className="container mx-auto text-center">
					<h2 className="text-4xl font-bold text-gray-900 mb-8">Our Mission</h2>
					<p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
						Our platform aims to make Sanskrit knowledge accessible to everyone. We provide a structured and interactive way to learn Sanskrit shlokas,
						understand their meanings, and appreciate their significance.
					</p>
				</div>
			</section>

			{/* Features Section */}
			<section className="py-24 px-4 sm:px-6 lg:px-8">
				<div className="container mx-auto">
					<h2 className="text-4xl font-bold text-gray-900 mb-16 text-center">Key Features</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
						<FeatureCard
							title="Comprehensive Shloka Database"
							description="Access a vast collection of Sanskrit shlokas from different scriptures."
							icon="📚"
						/>
						<FeatureCard title="In-depth Analysis" description="Detailed interpretations, translations, and context for every shloka." icon="🔍" />
						<FeatureCard title="Interactive Learning" description="Quizzes, discussions, and structured courses to enhance understanding." icon="✨" />
						<FeatureCard title="Personalized Learning Paths" description="Adaptive learning that suits your pace and interests." icon="🎯" />
						<FeatureCard title="Community Engagement" description="Join a like-minded community passionate about Sanskrit literature." icon="🤝" />
						<FeatureCard title="Modern Applications" description="Discover how Sanskrit philosophy applies to today's world." icon="🌏" />
					</div>
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

// Feature Card Component
function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
	return (
		<div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
			<div className="text-4xl mb-4">{icon}</div>
			<h3 className="text-2xl font-semibold text-gray-900 mb-4">{title}</h3>
			<p className="text-gray-600 leading-relaxed">{description}</p>
		</div>
	);
}

// Team Member Component
function TeamMember({ name, role, description }: { name: string; role: string; description: string }) {
	return (
		<div className="bg-white p-6 rounded-lg shadow-lg text-center">
			<h3 className="text-2xl font-bold text-gray-900">{name}</h3>
			<p className="text-purple-600 text-lg font-semibold">{role}</p>
			<p className="text-gray-600 mt-2">{description}</p>
		</div>
	);
}

export default MainPage;
