import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export default function MaintenancePage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
			<Card className="max-w-md w-full">
				<CardHeader className="text-center">
					<div className="flex justify-center mb-4">
						<Wrench className="h-12 w-12 text-yellow-500" />
					</div>
					<CardTitle className="text-2xl font-bold">Website Under Maintenance</CardTitle>
					<CardDescription className="text-lg mt-2">We're currently performing some maintenance on our website. Please check back later.</CardDescription>
				</CardHeader>
				<CardContent className="text-center text-muted-foreground">
					<p>We apologize for any inconvenience this may cause.</p>
					<p className="mt-2">Our team is working hard to bring the website back online as soon as possible.</p>
				</CardContent>
			</Card>
		</div>
	);
}
