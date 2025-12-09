import mongoose from "mongoose";

type ConnectionObject = {
	isConnected?: number;
};

const connection: ConnectionObject = {};

async function dbConnect(): Promise<void> {
	if (connection.isConnected) {
		console.log("Already connected to Database");
		return;
	}
	try {
		const mongoUri = process.env.MONGO_URI || "";
		
		if (!mongoUri) {
			throw new Error("MONGO_URI environment variable is not set");
		}

		// Configure mongoose connection options for better reliability
		// Note: directConnection should NOT be used with MongoDB Atlas clusters
		// It's only for standalone MongoDB instances
		const options = {
			serverSelectionTimeoutMS: 30000, // 30 seconds (increased for mobile networks)
			socketTimeoutMS: 45000, // 45 seconds
			connectTimeoutMS: 30000, // 30 seconds (increased for mobile networks)
			maxPoolSize: 10,
			retryWrites: true,
			// Remove directConnection - it's not for Atlas clusters
		};

		const db = await mongoose.connect(mongoUri, options);

		connection.isConnected = db.connection.readyState;

		console.log("DB Connected Successfully");
	} catch (error: any) {
		console.error("Error connecting to database", error);
		
		// Check for IP whitelist error
		if (
			error?.name === "MongooseServerSelectionError" ||
			error?.message?.includes("whitelist") ||
			error?.message?.includes("IP address")
		) {
			console.error("\n=== IP Whitelist Error ===");
			console.error("Your current IP address is not whitelisted in MongoDB Atlas.");
			console.error("\nTo fix this:");
			console.error("1. Go to MongoDB Atlas Dashboard: https://cloud.mongodb.com/");
			console.error("2. Navigate to: Network Access (or IP Access List)");
			console.error("3. Click 'Add IP Address'");
			console.error("4. Option A (Recommended for Development): Add '0.0.0.0/0' to allow all IPs");
			console.error("   (Note: This is less secure, use only for development)");
			console.error("5. Option B (More Secure): Add your current IP address");
			console.error("   - You can find your IP at: https://whatismyipaddress.com/");
			console.error("   - Note: Mobile hotspot IPs change frequently");
			console.error("\nAfter adding your IP, wait 1-2 minutes and try again.");
		}
		// Check for DNS errors
		else if (error?.code === "ECONNREFUSED" || error?.name === "DNSException") {
			console.error("\n=== DNS Resolution Error ===");
			console.error("This error typically occurs when using mobile hotspots or networks with DNS issues.");
			console.error("\nPossible solutions:");
			console.error("1. Change your DNS servers to Google DNS (8.8.8.8, 8.8.4.4) or Cloudflare (1.1.1.1)");
			console.error("2. Use a different network connection (WiFi instead of mobile hotspot)");
			console.error("3. Check if your mobile carrier blocks certain DNS queries");
			console.error("\nTo change DNS on macOS:");
			console.error("System Settings > Network > [Your Connection] > Details > DNS");
		}
		
		// Don't exit in development - allow the app to continue
		if (process.env.NODE_ENV === "production") {
			process.exit(1);
		} else {
			console.warn("Continuing without database connection (development mode)");
		}
	}
}

export default dbConnect;
