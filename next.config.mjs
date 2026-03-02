/** @type {import('next').NextConfig} */
const nextConfig = {
	// Reduce bundle size: tree-shake lucide-react, @radix-ui, lodash
	experimental: {
		optimizePackageImports: [
			"lucide-react",
			"@radix-ui/react-icons",
			"@radix-ui/react-dialog",
			"@radix-ui/react-dropdown-menu",
			"@radix-ui/react-popover",
			"@radix-ui/react-select",
			"@radix-ui/react-tabs",
			"@radix-ui/react-tooltip",
		],
	},
};

export default nextConfig;
