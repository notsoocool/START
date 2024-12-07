"use client";
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

	if (loading) return <p>Loading...</p>;
	if (error) return <p>Error: {error}</p>;

	return (
		<div>
			<h1>Welcome to the Main Page</h1>
			{user ? (
				<div>
					<p>User ID: {user.id}</p>
					<p>First Name: {user.firstName}</p>
					<p>Last Name: {user.lastName}</p>
					<p>Permission: {user.perms}</p>
				</div>
			) : (
				<p>User not found.</p>
			)}
		</div>
	);
};

export default MainPage;
