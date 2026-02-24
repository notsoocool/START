import { Footer } from "@/components/global/footer";
import { Header } from "@/components/global/header";
import { PresenceHeartbeat } from "@/components/global/PresenceHeartbeat";
import { Toaster } from "@/components/ui/sonner";

type Props = {
	children: React.ReactNode;
};
const DashboardLayout = ({ children }: Props) => {
	return (
		<div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-950 dark:to-gray-900">
			<PresenceHeartbeat />
			<Header />
			<Toaster />
			<main className="flex-grow px-3 lg:px-14">{children}</main>
			<Footer />
		</div>
	);
};

export default DashboardLayout;
