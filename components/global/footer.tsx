import Link from "next/link";
import { Button } from "../ui/button";
import { Github } from "lucide-react";

export const Footer = () => {
	return (
		<footer className="w-full border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm">
			<div className="py-10 px-10">
				<div className="flex flex-col justify-between sm:flex-row sm:items-center max-w-screen-2xl mx-auto">
					<p className="text-center text-sm leading-loose text-muted-foreground sm:text-left">
						Built by{" "}
						<a
							href="https://yajushvyas.in"
							target="_blank"
							rel="noreferrer"
							className="font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
						>
							notsoocool
						</a>
						. Got feedback?{" "}
						<a
							href="mailto:vyasyajush@gmail.com"
							target="_blank"
							rel="noreferrer"
							className="font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors relative before:absolute before:bottom-0 before:left-0 before:h-[2px] before:w-0 before:bg-purple-600 dark:before:bg-purple-400 before:transition-all before:duration-300 hover:before:w-full"
						>
							Contact me
						</a>
					</p>
					<div className="flex items-center justify-center space-x-4 sm:ml-auto sm:justify-end mt-4 sm:mt-0">
						<Link
							href="https://github.com/notsoocool/start"
							target="_blank"
							rel="noreferrer"
						>
							<Button
								variant="ghost"
								size="icon"
								className="hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
							>
								<Github className="h-5 w-5 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors" />
								<span className="sr-only">GitHub</span>
							</Button>
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
};
