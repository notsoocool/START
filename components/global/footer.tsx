import Link from "next/link";
import { Button } from "../ui/button";
import { Github } from "lucide-react";

export const Footer = () => {
	return (
		<footer className="w-full border-t bg-background">
			<div className="py-8 px-10">
				<div className="flex flex-col justify-between sm:flex-row sm:items-center">
					<p className="text-center text-sm leading-loose text-muted-foreground sm:text-left">
						<a href="https://yajushvyas.in" target="_blank" rel="noreferrer" className="font-medium underline underline-offset-4">
							notsoocool
						</a>
						. Got feedback?
						<a
							href="mailto:vyasyajush@gmail.com"
							target="_blank"
							rel="noreferrer"
							className="font-medium relative transition-all duration-300 ease-in-out before:absolute before:bottom-0 before:left-0 before:h-[2px] before:w-0 before:bg-current before:transition-all before:duration-300 before:ease-in-out hover:before:w-full"
						>
							{" "}Contact me
						</a>
						.
					</p>
					<div className="flex items-center justify-center space-x-4 sm:ml-auto sm:justify-end">
						<Link href="https://github.com/notsoocool/start" target="_blank" rel="noreferrer">
							<Button variant="ghost" size="icon">
								<Github className="h-5 w-5" />
								<span className="sr-only">GitHub</span>
							</Button>
						</Link>
						{/* <Link
							href="https://twitter.com/"
							target="_blank"
							rel="noreferrer"
						>
							<Button variant="ghost" size="icon">
								<Twitter className="h-5 w-5" />
								<span className="sr-only">Twitter</span>
							</Button>
						</Link> */}
					</div>
				</div>
			</div>
		</footer>
	);
};
