"use client";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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
		const fetchAndHandleUser = async () => {
			try {
				// Step 1: Fetch existing user
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
					throw new Error("Unexpected error while fetching user");
				}
			} catch (err: any) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetchAndHandleUser();
	}, []);

	if (loading)
		return (
			<p className="flex h-[80vh] spin items-center justify-center">
				<Loader className="animate-spin" />
			</p>
		);
	if (error) return <p>Error: {error}</p>;

	return (
		<div>
			<section className="py-20 px-4 sm:px-6 lg:px-8">
				<div className="container mx-auto text-center">
					<h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Learn Sanskrit Literature with Ease</h1>
					<p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
						Explore shlokas and their in-depth analysis to master Sanskrit literature effortlessly.
					</p>
                    <Link href="/books">
					<Button size="lg">Get Started</Button>
                    </Link>
				</div>
			</section>
			<section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
				<div className="container mx-auto">
					<h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Why Choose Start?</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
						<FeatureCard title="Comprehensive Shloka Database" description="Access a vast collection of Sanskrit shlokas from various texts and traditions." />
						<FeatureCard title="In-depth Analysis" description="Gain insights with detailed explanations and interpretations of each shloka." />
						<FeatureCard title="Interactive Learning" description="Engage with the content through quizzes, discussions, and personalized learning paths." />
					</div>
				</div>
			</section>
			{/*  ? (
				<>
					<div>
						<p>User ID: {user.id}</p>
						<p>First Name: {user.firstName}</p>
						<p>Last Name: {user.lastName}</p>
						<p>Permission: {user.perms}</p>
					</div>
				</>
			) : (
				<p>User not found.</p>
			)} */}
		</div>
	);
};

function FeatureCard({ title, description }: { title: string; description: string }) {
	return (
		<div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
			<h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
			<p className="text-gray-600">{description}</p>
		</div>
	);
}

export default MainPage;
