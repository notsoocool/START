import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

type Props = {
	href: string;
	label: string;
	isActive: boolean;
};

export const NavButton = ({ href, label, isActive }: Props) => {
	return (
		<Button
			asChild
			size="sm"
			variant="ghost"
			className={cn(
				"relative w-full lg:w-auto font-medium transition-all duration-300",
				"hover:bg-purple-100 dark:hover:bg-purple-900/30",
				"hover:text-purple-700 dark:hover:text-purple-300",
				isActive && [
					"text-purple-700 dark:text-purple-300",
					"after:absolute after:bottom-0 after:left-0 after:right-0",
					"after:h-0.5 after:bg-purple-600 dark:after:bg-purple-400",
					"after:rounded-full",
				]
			)}
		>
			<Link href={href} data-navigate="true">
				{label}
			</Link>
		</Button>
	);
};
