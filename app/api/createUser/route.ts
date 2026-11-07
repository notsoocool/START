// api/saveUserInfo/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Perms from "@/lib/db/permissionsModel"; // Adjust the path as needed
import dbConnect from "@/lib/db/connect";
import { primaryEmailFromClerkUser } from "@/lib/auth/clerkEmail";

export async function POST() {
    await dbConnect();
    const user = await currentUser();

    if (!user) {
        return NextResponse.json(
            { error: "User not authenticated" },
            { status: 401 }
        );
    }

    const { id, firstName, lastName } = user;
    const name = `${firstName} ${lastName}`; // Combine first and last names
    const email = primaryEmailFromClerkUser(user);

    // Check if user already exists in the database
    const existingUser = await Perms.findOne({ userID: id });
    if (existingUser) {
        if (email && !existingUser.email) {
            existingUser.email = email;
            await existingUser.save();
        }
        return NextResponse.json(
            { message: "User already exists" },
            { status: 200 }
        );
    }

    // Create a new user record
    const newUser = new Perms({
        userID: id,
        name: name,
        email,
        perms: 'User', // Default permission
    });

    await newUser.save();

    return NextResponse.json({ success: true, user: newUser });
}