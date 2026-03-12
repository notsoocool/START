"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	Mail,
	MapPin,
	Building2,
	GraduationCap,
	Users,
	Code,
	BookOpen,
	Stethoscope,
	CheckCircle2,
	Sparkles,
	Heart,
	Loader2,
	ExternalLink,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useBooks } from "@/lib/hooks/use-api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function getInitials(name: string): string {
	const cleaned = name.replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.|Prof\.)\s*/i, "").trim();
	const parts = cleaned.split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	const first = parts[0]?.[0] ?? "";
	const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : parts[0]?.[1] ?? "";
	return (first + last).toUpperCase().slice(0, 2) || "?";
}

function isFemale(name: string): boolean {
	return /^Ms\.?\s/i.test(name) || /^Mrs\.?\s/i.test(name);
}

interface Contributor {
	name: string;
	role?: string;
	title?: string;
	affiliation?: string;
	location?: string;
	email?: string;
	phone?: string;
	website?: string;
	validated?: string;
}

interface BookContributors {
	bookName: string;
	bookNameEnglish?: string;
	annotators?: Contributor[];
	experts?: Contributor[];
	validators?: Contributor[];
	ayurvedaExpert?: Contributor[];
}

const PROJECT_INFO_TEMPLATE = (bookName: string) =>
	`The E-reader for ${bookName} is developed under the project 'Sanskrit Knowledge Accessor' funded by Ministry of Electronics and Information Technology as a part of Bhashini project, during 2024-26. Prof. Amba Kulkarni, Department of Sanskrit Studies, University of Hyderabad led the consortium project 'Sanskrit Knowledge Accessor'.`;

// Shared across all books
const SHARED_SOFTWARE_DEVELOPMENT: Contributor[] = [
	{
		name: "Yajush Vyas",
		title: "Full Stack Developer",
		location: "New Delhi, India",
		email: "vyasyajush@gmail.com",
		website: "https://www.yajushvyas.in",
	},
];

const bookData: Record<string, BookContributors> = {
	अष्टाङ्गहृदयम्: {
		bookName: "अष्टाङ्गहृदयम्",
		bookNameEnglish: "Ashtanga Hridayam",
		annotators: [
			{
				name: "Ms Vasudha Neelamana",
			},
			{
				name: "Ms Sandhra K.R.",
			},
			{
				name: "Ms Krishnapriya P.S",
			},
		],
		ayurvedaExpert: [
			{
				name: "Dr. K Saraswathi Himabala",
                title: "Senior Research Scientist"
			},
		],
		validators: [
			{
				name: "Dr. Ramakant P. Ayachit",
				title: "Assistant professor",
				affiliation: "Samhita and Siddhant (Sanskrit)",
				location:
					"Sai Ayurved college and research centre, Sasure, Vairag, Tal-Barshi, Dist- Solapur, Maharashtra",
				email: "dr.ramakantayachit@gmail.com",
				validated: "12, 5 + 3",
			},
			{
				name: "Dr. Shameena Begum",
				title: "Professor in Sanskrit",
				affiliation: "Department of Samhita, Sanskrit and Sidhantas",
				location: "Kanachur Ayurveda Medical College, Mangalur",
				email: "drshameenabeegum@gmail.com",
				validated: "13 + 4",
			},
			{
				name: "Dr. Anagha H. Ghodke",
				title: "Assistant professor",
				affiliation: "Samhita siddhant evam Sanskrit Dept",
				location: "Government Ayurvedic college, Dharashiv (MH) 413501",
				email: "dranaghaghodke@gmail.com",
				phone: "9892620936",
			},
			{
				name: "Sandhya Sharadrao Gorthekar",
				title: "Assistant Professor",
				affiliation: "C.S.M.S.S. Ayurved mahavidyalaya",
				location: "Kanchanwadi, Chh.Sambhajinagar, Maharashtra",
				email: "sandhyagorthekar@gmail.com",
				validated: "3, 11 + 13",
			},
			{
				name: "Dr. Namrata Padalkar Joshi",
				title: "Assistant professor (Department of Kayachikitsa)",
				affiliation:
					"Datta Meghe Ayurved Medical College, Hospital and Research Centre",
				location: "Wanadongari, Nagpur, Maharashtra- 441110",
				email: "namrata.padalkar@gmail.com",
				validated: "12, 7 + 8",
			},
			{
				name: "Dr. P. S. Narlawar (Darshana Wargantikar)",
				affiliation: "DMM Ayurved college",
				location: "Arni road yavatmal, 445001, Maharashtra State",
				email: "darshanaww@gmail.com",
			},
			{
				name: "Dr. Avi Pal",
				title: "Assistant Professor",
				affiliation:
					"J.B.Roy State Ayurvedic Medical College & Hospital",
				location:
					"170-172, Raja Dinendra Street, Kolkata - 700004, West Bengal",
				email: "avipalantpur18@gmail.com",
				validated: "1, 8 + 7",
			},
			{
				name: "Dr. Debabrata Panda",
				title: "Assistant professor in Sanskrit",
				affiliation: "Rajiv Gandhi Ayurveda Medical college Mahe",
				location: "Chalakkara, New Mahe, Puducherry -673311",
				email: "panda.debabrata@gmail.com",
				validated: "4, 14 + 1",
			},
			{
				name: "Dr. Shital B Patil",
				affiliation: "Bhaisaheb Sawant Ayurved College",
				location: "Sawantwadi, Maharashtra",
				email: "drsbp204@gmail.com / bsamswadi@gmail.com",
				validated: "12, 13 + 6",
			},
			{
				name: "Dr. Jatin Purkha",
				title: "Asst. Professor",
				affiliation: "Dr.Vasant Parikh Ayurvedic Medical College",
				location: "Vadnagar 384355 (Gujarat)",
				email: "jatinpurkha@gmail.com",
				validated: "9, 6 + 2",
			},
			{
				name: "Somnath Shinde",
				location:
					"A8 Rupa Willows Society, Opposite Ashok Nagar, Dadalani Park, Balkum Thane-400608",
				email: "somnath.shinde@dypatil.edu / shastrisomnath@gmail.com",
			},
			{
				name: "Dr. Vibhavari Manish Vaidya",
				title: "Assistant Professor in Sanskrit",
				affiliation: "SSAM Hadapasar Pune",
				email: "ssayu3206@rediffmail.com",
				validated: "3, 10 + 5",
			},
			{
				name: "Dr. Gayatri Vyas",
				title: "Assistant Professor",
				affiliation: "Shri Ayurved Mahavidyalaya",
				location: "Hanumannagar, Nagpur 440024",
				email: "dr.gayatrivyas@gmail.com",
				validated: "5 + 9",
			},
		],
		experts: [
			{
				name: "Dr. T. Saketh Ram",
				title: "Research Officer (Ayurveda)",
				affiliation:
					"CCRAS-National Institute of Indian Medical Heritage",
				location:
					"Revenue Board Colony, Gaddiannaram, Hyderabad-500036, Telangana State, India",
				email: "dr.saketram@gmail.com",
			},
			{
				name: "Dr. Santhosh SR Nair",
				title: "Associate Professor & Head, Dept of Samhita Siddhanta",
				affiliation: "CBPACS, New Delhi",
				email: "santhoshsrnair@hotmail.com",
			},
			{
				name: "Dr. Mahesh Vyas",
				title: "Professor and Head, Dean Academic",
				affiliation: "All India Institute of Ayurveda",
				location:
					"Mathura Road, Gautam Puri, Sarita Vihar, Delhi 110076",
				email: "dean-academic@aiia.gov.in",
			},

			{
				name: "Dr. Sriprasad Bavadekar",
				location:
					"1A Radha Govind apts, 433 Narayan peth, Near patrya maruti, Pune 411030",
			},
		],
	},
};

const ContributorCard = ({ contributor }: { contributor: Contributor }) => {
	const initials = getInitials(contributor.name);
	const female = isFemale(contributor.name);
	return (
		<Card className="group relative overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5">
			<CardContent className="p-6">
				<div className="flex gap-4">
					{/* Avatar with initials - blue for men, pink for women */}
					<div
						className={`shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-sm font-semibold text-white transition-colors ${
							female
								? "bg-gradient-to-br from-pink-500 to-pink-600"
								: "bg-gradient-to-br from-blue-500 to-blue-600"
						}`}
					>
						{initials}
					</div>
					<div className="min-w-0 flex-1 space-y-2">
						<h4 className="font-semibold text-base text-foreground">
							{contributor.name}
						</h4>
						{contributor.title && (
							<p className="text-sm text-muted-foreground flex items-start gap-2">
								<GraduationCap className="h-3.5 w-3.5 mt-0.5 text-primary/80 flex-shrink-0" />
								<span className="leading-relaxed">{contributor.title}</span>
							</p>
						)}
						{contributor.affiliation && (
							<p className="text-sm text-muted-foreground flex items-start gap-2">
								<Building2 className="h-3.5 w-3.5 mt-0.5 text-primary/80 flex-shrink-0" />
								<span className="leading-relaxed line-clamp-2">{contributor.affiliation}</span>
							</p>
						)}
						{contributor.location && (
							<p className="text-xs text-muted-foreground flex items-start gap-2">
								<MapPin className="h-3 w-3 mt-0.5 text-primary/80 flex-shrink-0" />
								<span className="leading-relaxed line-clamp-2">{contributor.location}</span>
							</p>
						)}
						{contributor.email && (
							<p className="text-sm flex items-center gap-2">
								<Mail className="h-3.5 w-3.5 text-primary/80 flex-shrink-0" />
								{contributor.email.includes(" / ") ? (
									<span className="text-muted-foreground leading-relaxed truncate">{contributor.email}</span>
								) : (
									<a
										href={`mailto:${contributor.email.trim()}`}
										className="text-primary hover:underline leading-relaxed truncate"
									>
										{contributor.email}
									</a>
								)}
							</p>
						)}
						{contributor.phone && (
							<p className="text-sm text-muted-foreground">
								{contributor.phone}
							</p>
						)}
						{contributor.website && (
							<a
								href={contributor.website}
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm flex items-center gap-2 text-primary hover:underline"
							>
								<ExternalLink className="h-3.5 w-3.5 shrink-0" />
								Portfolio
							</a>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

const ContributorSection = ({
	title,
	contributors,
	icon: Icon,
}: {
	title: string;
	contributors: Contributor[];
	icon?: React.ElementType;
}) => {
	if (!contributors || contributors.length === 0) return null;

	const getSectionIcon = () => {
		if (title.toLowerCase().includes("software")) return Code;
		if (title.toLowerCase().includes("annotator")) return BookOpen;
		if (title.toLowerCase().includes("ayurveda")) return Stethoscope;
		if (title.toLowerCase().includes("validator")) return CheckCircle2;
		if (title.toLowerCase().includes("expert")) return Sparkles;
		return Icon || Users;
	};

	const SectionIcon = getSectionIcon();

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center gap-3">
				<div className="flex items-center gap-3">
					<div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
						<SectionIcon className="h-5 w-5 text-primary" />
					</div>
					<h3 className="text-xl font-semibold text-foreground">
						{title}
					</h3>
				</div>
				<Badge variant="secondary" className="text-xs font-medium">
					{contributors.length} {contributors.length === 1 ? "contributor" : "contributors"}
				</Badge>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
				{contributors.map((contributor, index) => (
					<ContributorCard key={index} contributor={contributor} />
				))}
			</div>
		</div>
	);
};

const BOOK_SECTION_ORDER = ["experts", "validators", "ayurvedaExpert", "annotators"] as const;

type BookToShow = {
	bookKey: string;
	bookName: string;
	bookNameEnglish?: string;
	contributorData?: BookContributors;
};

export default function AboutPage() {
	const { data: booksData, isLoading, error } = useBooks();
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	// Filter to user-published books only
	const userPublishedBooks = (booksData ?? []).filter(
		(item: { book?: string; status?: { userPublished?: boolean } }) =>
			item.status?.userPublished === true
	);

	// Merge with bookData: for each user-published book, use bookData if available
	const booksToShow: BookToShow[] = userPublishedBooks.map(
		(item: { book?: string }) => {
			const bookKey = item.book ?? "";
			const contributorData = bookData[bookKey];
			return {
				bookKey,
				bookName: contributorData?.bookName ?? bookKey,
				bookNameEnglish: contributorData?.bookNameEnglish,
				contributorData: contributorData ?? undefined,
			};
		}
	);

	const validTabValues = ["software", ...booksToShow.map((b) => b.bookKey)];
	const tabFromUrl = searchParams.get("tab");
	const initialTab = validTabValues.includes(tabFromUrl ?? "") ? tabFromUrl! : "software";
	const [activeTab, setActiveTab] = useState(initialTab);

	// Sync tab state with URL
	useEffect(() => {
		if (validTabValues.includes(tabFromUrl ?? "") && tabFromUrl !== activeTab) {
			setActiveTab(tabFromUrl!);
		}
	}, [tabFromUrl]);

	const handleTabChange = (value: string) => {
		setActiveTab(value);
		const params = new URLSearchParams(searchParams.toString());
		params.set("tab", value);
		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	};

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
				<Loader2 className="h-10 w-10 animate-spin text-primary" />
				<p className="text-muted-foreground">Loading books...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="container mx-auto py-24 px-4">
				<Card className="rounded-2xl border border-border/50 max-w-md mx-auto">
					<CardContent className="py-12 text-center">
						<p className="text-destructive">Failed to load books.</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (booksToShow.length === 0) {
		return (
			<div className="container mx-auto py-24 px-4">
				<Card className="rounded-2xl border border-border/50 max-w-md mx-auto">
					<CardContent className="py-12 text-center">
						<Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
						<p className="text-muted-foreground">
							No user-published books yet. Contributor information will appear here when books are published.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
			{/* Hero Section */}
			<div className="relative overflow-hidden">
				<div
					className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
					style={{
						backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
						backgroundSize: "40px 40px",
					}}
				/>
				<div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
				<div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl" />

				<div className="container mx-auto px-4 max-w-7xl relative z-10">
					<div className="py-16 lg:py-24">
						<div className="space-y-6 max-w-3xl">
							<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm w-fit">
								<Sparkles className="h-3.5 w-3.5 text-primary" />
								<span className="text-xs font-medium text-primary uppercase tracking-wider">
									Contributors & Team
								</span>
							</div>
							<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
								<span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
									About
								</span>
							</h1>
							<p className="text-muted-foreground leading-relaxed">
								The platform creators and the scholars behind each Sanskrit e-reader. A collaborative effort to make classical knowledge accessible through structured analysis and expert validation.
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Tabbed content */}
			<div className="container mx-auto px-4 max-w-7xl pb-16">
				<Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
					<TabsList className="w-full flex-wrap h-auto gap-1 p-2 bg-muted/50 mb-6">
						<TabsTrigger value="software" className="flex items-center gap-2 px-4 py-2">
							<Code className="h-4 w-4" />
							Software
						</TabsTrigger>
						{booksToShow.map(({ bookKey, bookName, bookNameEnglish }) => (
							<TabsTrigger key={bookKey} value={bookKey} className="flex items-center gap-2 px-4 py-2">
								<BookOpen className="h-4 w-4" />
								{bookNameEnglish ?? bookName}
							</TabsTrigger>
						))}
					</TabsList>

					<TabsContent value="software" className="mt-0">
						<ContributorSection
							title="Software Development"
							contributors={SHARED_SOFTWARE_DEVELOPMENT}
							icon={Code}
						/>
					</TabsContent>

					{booksToShow.map(({ bookKey, bookName, bookNameEnglish, contributorData }) => {
						const projectInfo = PROJECT_INFO_TEMPLATE(bookNameEnglish ?? bookName);
						return (
							<TabsContent key={bookKey} value={bookKey} className="mt-0 space-y-12">
								{/* Book header */}
								<div className="space-y-2">
									<h2 className="text-2xl md:text-3xl font-bold text-foreground">
										{bookName}
									</h2>
									{bookNameEnglish && (
										<p className="text-lg text-muted-foreground font-light">
											{bookNameEnglish}
										</p>
									)}
								</div>

								{/* Project Information */}
								<Card className="rounded-2xl border-2 border-white/20 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-xl overflow-hidden">
									<CardHeader className="pb-2">
										<CardTitle className="flex items-center gap-3 text-lg font-semibold">
											<div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
												<Users className="h-5 w-5 text-primary" />
											</div>
											Project Information
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-muted-foreground leading-relaxed">
											{projectInfo}
										</p>
									</CardContent>
								</Card>

								{/* Contributors */}
								{contributorData ? (
									<div className="space-y-14">
										{BOOK_SECTION_ORDER.map((sectionKey) => {
											const contributors = contributorData[sectionKey];
											if (!contributors || contributors.length === 0) return null;
											const titles: Record<(typeof BOOK_SECTION_ORDER)[number], string> = {
												experts: "Experts",
												validators: "Validators",
												ayurvedaExpert: "Ayurveda Expert",
												annotators: "Annotators",
											};
											const icons: Record<(typeof BOOK_SECTION_ORDER)[number], React.ElementType> = {
												experts: Sparkles,
												validators: CheckCircle2,
												ayurvedaExpert: Stethoscope,
												annotators: BookOpen,
											};
											return (
												<div key={sectionKey}>
													<ContributorSection
														title={titles[sectionKey]}
														contributors={contributors}
														icon={icons[sectionKey]}
													/>
												</div>
											);
										})}
									</div>
								) : (
									<p className="text-sm text-muted-foreground italic">
										Contributor information will be added soon.
									</p>
								)}
							</TabsContent>
						);
					})}
				</Tabs>
			</div>

			{/* Footer Note - compact & catchy */}
			<div className="container mx-auto px-4 max-w-7xl pb-16">
				<div className="group relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10/50 to-primary/5 px-5 py-3.5 flex items-center justify-center gap-3 text-center hover:border-primary/30 transition-colors duration-300">
					<Heart className="h-5 w-5 text-primary fill-primary shrink-0 animate-pulse transition-transform group-hover:scale-110" />
					<p className="text-sm text-foreground/90 font-medium">
						Thank you to all contributors for making this possible
						<span className="inline-flex ml-1.5 gap-0.5 opacity-80">
							<Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
							<Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
							<Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" style={{ animationDelay: "0.6s" }} />
						</span>
					</p>
					{/* Shimmer sweep on hover */}
					<div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
				</div>
			</div>
		</div>
	);
}
