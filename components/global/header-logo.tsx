import Link from "next/link";
import Image from "next/image";

export const HeaderLogo = () => {
	return (
		<Link href="/" className="transition-transform hover:scale-105 duration-300">
			<div className="items-center hidden lg:flex group">
				<Image 
					src="/logo.svg" 
					alt="Logo" 
					width={32} 
					height={32} 
					className="invert-0 dark:invert transition-transform group-hover:rotate-12 duration-300"
				/>
				<p className="font-bold text-2xl ml-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
					START
				</p>
			</div>
		</Link>
	);
};
