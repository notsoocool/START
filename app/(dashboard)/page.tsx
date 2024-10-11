// app/page.tsx (or your main page file)
"use client"
import { useEffect, useState } from "react";

interface User {
	id: string;
	firstName: string;
	lastName: string;
    perms: "user" | "annotator" | "editor" | "admin" | "root";
}

const MainPage = () => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchUserData = async () => {
			const response = await fetch("/api/getCurrentUser");

			if (!response.ok) {
				const data = await response.json();
				setError(data.error);
				setLoading(false);
				return;
			}

			const data = await response.json();
			setUser(data);
			setLoading(false);
		};
        const loadUserInfo = async () => {
            const response = await fetch("/api/createUser", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();
            if (response.ok) {
                console.log("User info saved successfully!");
            } else {
                console.log(`Error: ${data.error}`);
            }
        };

		fetchUserData();
        loadUserInfo();
	}, []);
    const saveUserInfo = async () => {
        const response = await fetch("/api/createUser", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });
    
        const data = await response.json();
        if (response.ok) {
            alert("User info saved successfully!");
        } else {
            alert(`Error: ${data.error}`);
        }
    };
    

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
