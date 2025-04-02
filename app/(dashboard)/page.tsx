"use client";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorDisplay } from "@/components/global/ErrorDisplay";

interface User {
	id: string;
	firstName: string;
	lastName: string;
	perms: "User" | "Annotator" | "Editor" | "Admin" | "Root";
}

const MainPage = () => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchAndHandleUser = async (retryCount = 0) => {
			try {
				const userResponse = await fetch("/api/getCurrentUser");

				if (userResponse.ok) {
					const existingUser = await userResponse.json();
					setUser(existingUser);
				} else if (userResponse.status === 404) {
					// Step 2: Create new user if not found
					const newUserResponse = await fetch("/api/createUser", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({ perms: "User" }), // Default permission
					});

					if (newUserResponse.ok) {
						const newUser = await newUserResponse.json();
						setUser(newUser);
					} else {
						const errorData = await newUserResponse.json();
						throw new Error(errorData.error || "Failed to create new user");
					}
				} else {
					// Add retry logic for unexpected errors
					if (retryCount < 3) {
						setTimeout(() => {
							fetchAndHandleUser(retryCount + 1);
						}, 1000 * (retryCount + 1)); // Exponential backoff
						return;
					}
					throw new Error("Unexpected error while fetching user");
				}
			} catch (err: any) {
				if (retryCount < 3) {
					setTimeout(() => {
						fetchAndHandleUser(retryCount + 1);
					}, 1000 * (retryCount + 1)); // Exponential backoff
					return;
				}
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetchAndHandleUser();
	}, []);

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
			<section className="py-32 px-4 sm:px-6 lg:px-8">
				<div className="container mx-auto text-center">
					<h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
						Learn Sanskrit Literature with Ease
					</h1>
					<p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
						Explore shlokas and their in-depth analysis to master Sanskrit literature effortlessly.
					</p>
					<Link href="/books">
						<Button
							size="lg"
							className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
						>
							Get Started
						</Button>
					</Link>
				</div>
			</section>

			<section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
				<div className="container mx-auto">
					<h2 className="text-4xl font-bold text-gray-900 mb-16 text-center">
						Why Choose <span className="text-purple-600">Start?</span>
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
						<FeatureCard
							title="Comprehensive Shloka Database"
							description="Access a vast collection of Sanskrit shlokas from various texts and traditions."
							icon="📚"
						/>
						<FeatureCard title="In-depth Analysis" description="Gain insights with detailed explanations and interpretations of each shloka." icon="🔍" />
						<FeatureCard
							title="Interactive Learning"
							description="Engage with the content through quizzes, discussions, and personalized learning paths."
							icon="✨"
						/>
					</div>
				</div>
			</section>
		</div>
	);
};

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
	return (
		<div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
			<div className="text-4xl mb-4">{icon}</div>
			<h3 className="text-2xl font-semibold text-gray-900 mb-4">{title}</h3>
			<p className="text-gray-600 leading-relaxed">{description}</p>
		</div>
	);
}

export default MainPage;
