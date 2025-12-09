"use client";

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
} from "lucide-react";
import { useEffect, useState } from "react";

interface Contributor {
	name: string;
	role?: string;
	title?: string;
	affiliation?: string;
	location?: string;
	email?: string;
	phone?: string;
	validated?: string;
}

interface BookContributors {
	bookName: string;
	bookNameEnglish?: string;
	projectInfo: string;
	softwareDevelopment?: Contributor[];
	annotators?: Contributor[];
	experts?: Contributor[];
	validators?: Contributor[];
	ayurvedaExpert?: Contributor[];
}

const bookData: Record<string, BookContributors> = {
	अष्टाङ्गहृदयम्: {
		bookName: "अष्टाङ्गहृदयम्",
		bookNameEnglish: "Ashtanga Hridayam",
		projectInfo:
			"The E-reader for Ashtanga Hridayam is developed under the project 'Sanskrit Knowledge Accessor' funded by Ministry of Electronics and Information Technology as a part of Bhashini project, during 2024-26. Prof. Amba Kulkarni, Department of Sanskrit Studies, University of Hyderabad led the consortium project 'Sanskrit Knowledge Accessor'.",
		softwareDevelopment: [
			{
				name: "Yajush Vyas",
			},
		],
		annotators: [
			{
				name: "Ms Vasudha Neelamana",
			},
			{
				name: "Ms Sandra",
			},
			{
				name: "Ms Krishnapriya",
			},
		],
		ayurvedaExpert: [
			{
				name: "Dr. Saraswati Sarma",
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
	return (
		<Card className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 bg-gradient-to-br from-card to-card/50">
			{/* Decorative gradient overlay on hover */}
			<div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:via-primary/3 group-hover:to-primary/5 transition-all duration-300 pointer-events-none" />

			<CardContent className="pt-6 relative z-10">
				<div className="space-y-3">
					<div className="flex items-start justify-between gap-2">
						<h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors duration-300">
							{contributor.name}
						</h4>
						{contributor.validated && (
							<Badge
								variant="secondary"
								className="ml-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-700 dark:text-green-400 border-green-500/20 flex items-center gap-1"
							>
								<CheckCircle2 className="h-3 w-3" />
								{contributor.validated}
							</Badge>
						)}
					</div>
					{contributor.title && (
						<p className="text-sm text-muted-foreground flex items-start gap-2 group-hover:text-foreground transition-colors">
							<GraduationCap className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
							<span className="leading-relaxed">
								{contributor.title}
							</span>
						</p>
					)}
					{contributor.affiliation && (
						<p className="text-sm text-muted-foreground flex items-start gap-2 group-hover:text-foreground transition-colors">
							<Building2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
							<span className="leading-relaxed">
								{contributor.affiliation}
							</span>
						</p>
					)}
					{contributor.location && (
						<p className="text-sm text-muted-foreground flex items-start gap-2 group-hover:text-foreground transition-colors">
							<MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
							<span className="leading-relaxed">
								{contributor.location}
							</span>
						</p>
					)}
					{contributor.email && (
						<p className="text-sm text-muted-foreground flex items-start gap-2">
							<Mail className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
							{contributor.email.includes(" / ") ? (
								<span className="leading-relaxed">
									{contributor.email}
								</span>
							) : (
								<a
									href={`mailto:${contributor.email.trim()}`}
									className="text-primary hover:underline leading-relaxed transition-all duration-200 hover:text-primary/80"
								>
									{contributor.email}
								</a>
							)}
						</p>
					)}
					{contributor.phone && (
						<p className="text-sm text-muted-foreground flex items-center gap-2">
							<span className="leading-relaxed">
								{contributor.phone}
							</span>
						</p>
					)}
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

	// Get appropriate icon based on title
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
			<div className="flex items-center gap-4 pb-2 border-b-2 border-primary/20">
				<div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
					<SectionIcon className="h-6 w-6 text-primary" />
				</div>
				<h3 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
					{title}
				</h3>
				<Badge
					variant="outline"
					className="ml-auto px-4 py-1.5 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 text-primary font-semibold"
				>
					{contributors.length}{" "}
					{contributors.length === 1 ? "Contributor" : "Contributors"}
				</Badge>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{contributors.map((contributor, index) => (
					<ContributorCard key={index} contributor={contributor} />
				))}
			</div>
		</div>
	);
};

export default function AboutPage() {
	// For now, we only have data for अष्टाङ्गहृदयम्
	// In the future, this could be dynamic based on URL params or selection
	const selectedBook = "अष्टाङ्गहृदयम्";
	const bookInfo = bookData[selectedBook];

	if (!bookInfo) {
		return (
			<div className="container mx-auto py-8">
				<Card>
					<CardContent className="pt-6">
						<p className="text-center text-muted-foreground">
							Contributor information not available for this book.
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
				{/* Decorative background elements */}
				<div
					className="absolute inset-0 opacity-5"
					style={{
						backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)`,
						backgroundSize: "40px 40px",
					}}
				/>
				<div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
				<div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

				<div className="container mx-auto py-12 px-4 max-w-7xl relative z-10">
					<div className="text-center space-y-6 mb-12">
						<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4 animate-pulse">
							<Sparkles className="h-4 w-4 text-primary" />
							<span className="text-sm font-medium text-primary">
								Contributors & Team
							</span>
						</div>
						<h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600">
							{bookInfo.bookName}
						</h1>
						{bookInfo.bookNameEnglish && (
							<p className="text-2xl md:text-3xl text-muted-foreground font-light">
								{bookInfo.bookNameEnglish}
							</p>
						)}
					</div>

					{/* Project Information */}
					<Card className="mb-12 border-2 shadow-xl bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-sm">
						<CardHeader className="pb-4">
							<CardTitle className="flex items-center gap-3 text-2xl">
								<div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
									<Users className="h-6 w-6 text-primary" />
								</div>
								<span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
									Project Information
								</span>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground leading-relaxed text-lg">
								{bookInfo.projectInfo}
							</p>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Contributors Sections */}
			<div className="container mx-auto px-4 max-w-7xl space-y-12 pb-12">
				{/* Software Development */}
				{bookInfo.softwareDevelopment && (
					<>
						<ContributorSection
							title="Software Development"
							contributors={bookInfo.softwareDevelopment}
							icon={Code}
						/>
						<Separator className="my-8 opacity-30" />
					</>
				)}

				{/* Annotators */}
				{bookInfo.annotators && (
					<>
						<ContributorSection
							title="Annotators"
							contributors={bookInfo.annotators}
							icon={BookOpen}
						/>
						<Separator className="my-8 opacity-30" />
					</>
				)}

				{/* Ayurveda Expert */}
				{bookInfo.ayurvedaExpert && (
					<>
						<ContributorSection
							title="Ayurveda Expert"
							contributors={bookInfo.ayurvedaExpert}
							icon={Stethoscope}
						/>
						<Separator className="my-8 opacity-30" />
					</>
				)}

				{/* Validators */}
				{bookInfo.validators && (
					<>
						<ContributorSection
							title="Validators"
							contributors={bookInfo.validators}
							icon={CheckCircle2}
						/>
						<Separator className="my-8 opacity-30" />
					</>
				)}

				{/* Experts */}
				{bookInfo.experts && (
					<>
						<ContributorSection
							title="Experts"
							contributors={bookInfo.experts}
							icon={Sparkles}
						/>
					</>
				)}
			</div>

			{/* Footer Note */}
			<div className="container mx-auto px-4 max-w-7xl pb-12">
				<Card className="border-2 shadow-xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 backdrop-blur-sm">
					<CardContent className="pt-8 pb-8">
						<div className="flex flex-col items-center gap-4 text-center">
							<div className="p-3 rounded-full bg-primary/20 border border-primary/30">
								<Heart className="h-6 w-6 text-primary fill-primary" />
							</div>
							<p className="text-base md:text-lg text-foreground/80 leading-relaxed max-w-2xl font-medium">
								We extend our heartfelt gratitude to all
								contributors who have made this project possible
								through their dedication and expertise.
							</p>
							<div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
								<Sparkles className="h-4 w-4" />
								<span>
									Thank you for your invaluable contributions
								</span>
								<Sparkles className="h-4 w-4" />
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
