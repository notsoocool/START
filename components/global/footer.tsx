import Link from "next/link";
import Image from "next/image";
import { Github, FileText, Mail, ExternalLink } from "lucide-react";

const productLinks = [
	{ href: "/", label: "Home" },
	{ href: "/books", label: "E-Readers" },
	{ href: "/addshloka", label: "Add Shloka" },
	{ href: "/addword", label: "Add Word" },
	{ href: "/bookmarks", label: "Bookmarks" },
	{ href: "/group-info", label: "Group Info" },
	{ href: "/about", label: "About" },
];

const resourceLinks = [
	{ href: "https://aclanthology.org/2024.iscls-1.9/", label: "Paper", icon: FileText },
	{ href: "https://github.com/notsoocool/start", label: "GitHub", icon: Github },
];

const linkBase =
	"inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200 hover:translate-x-0.5";

export const Footer = () => {
	return (
		<footer className="relative w-full overflow-hidden">
			{/* Gradient accent line */}
			<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

			{/* Background with subtle gradient */}
			<div className="relative bg-gradient-to-b from-background via-muted/30 to-muted/50 dark:via-muted/20 dark:to-muted/30 border-t border-border/50">
				{/* Decorative gradient orbs */}
				<div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />
				<div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

				<div className="relative max-w-screen-2xl mx-auto px-6 py-16 sm:px-10 lg:py-20">
					<div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
						{/* Brand - spans more columns */}
						<div className="lg:col-span-5">
							<Link
								href="/"
								className="inline-flex items-center gap-3 group transition-transform hover:scale-[1.02] duration-300"
							>
								<Image
									src="/logo.svg"
									alt=""
									width={40}
									height={40}
									className="invert-0 dark:invert transition-transform group-hover:rotate-6 duration-300"
								/>
								<span className="font-bold text-2xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
									START
								</span>
							</Link>
							<p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
								Sanskrit Text Analysis and Reading Tool — making classical knowledge accessible through structured analysis.
							</p>
						</div>

						{/* Product links */}
						<div className="lg:col-span-2">
							<h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/80 mb-4">
								Product
							</h4>
							<ul className="space-y-3">
								{productLinks.map((link) => (
									<li key={link.href}>
										<Link href={link.href} className={linkBase}>
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</div>

						{/* Resources */}
						<div className="lg:col-span-2">
							<h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/80 mb-4">
								Resources
							</h4>
							<ul className="space-y-3">
								{resourceLinks.map((link) => {
									const Icon = link.icon;
									return (
										<li key={link.href}>
											<a
												href={link.href}
												target="_blank"
												rel="noopener noreferrer"
												className={linkBase}
											>
												<Icon className="h-4 w-4 shrink-0" />
												{link.label}
												<ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
											</a>
										</li>
									);
								})}
							</ul>
						</div>

						{/* Contact */}
						<div className="lg:col-span-3">
							<h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/80 mb-4">
								Contact
							</h4>
							<ul className="space-y-3">
								<li>
									<a
										href="mailto:vyasyajush@gmail.com"
										target="_blank"
										rel="noopener noreferrer"
										className={linkBase}
									>
										<Mail className="h-4 w-4 shrink-0" />
										Feedback
									</a>
								</li>
								<li>
									<a
										href="https://yajushvyas.in"
										target="_blank"
										rel="noopener noreferrer"
										className={linkBase}
									>
										Built by notsoocool
									</a>
								</li>
							</ul>
						</div>
					</div>

					{/* Bottom bar */}
					<div className="mt-16 pt-8 border-t border-border/50">
						<p className="text-center text-xs text-muted-foreground">
							© {new Date().getFullYear()} START · Sanskrit Knowledge Accessor project
						</p>
					</div>
				</div>
			</div>
		</footer>
	);
};
