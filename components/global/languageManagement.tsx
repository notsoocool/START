"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface Language {
	code: string;
	name: string;
	isManuallyAdded?: boolean;
}

// Language name to code mapping (for auto-detection)
const LANGUAGE_NAME_TO_CODE: { [key: string]: string } = {
	// Indian languages
	tamil: "ta",
	hindi: "hi",
	sanskrit: "sa",
	kannada: "kn",
	telugu: "te",
	malayalam: "ml",
	gujarati: "gu",
	punjabi: "pa",
	bengali: "bn",
	marathi: "mr",
	odia: "or",
	assamese: "as",
	nepali: "ne",
	urdu: "ur",
	// International languages
	english: "en",
	french: "fr",
	german: "de",
	spanish: "es",
	italian: "it",
	portuguese: "pt",
	russian: "ru",
	japanese: "ja",
	chinese: "zh",
	arabic: "ar",
};

// Helper function to find language code from name
const findLanguageCode = (name: string): string => {
	const normalizedName = name.toLowerCase().trim();
	return LANGUAGE_NAME_TO_CODE[normalizedName] || "";
};

export default function LanguageManagement() {
	const [languages, setLanguages] = useState<Language[]>([]);
	const [loading, setLoading] = useState(true);
	const [isAdding, setIsAdding] = useState(false);
	const [isDeleting, setIsDeleting] = useState<string | null>(null);
	const [openDialog, setOpenDialog] = useState(false);
	const [newLanguage, setNewLanguage] = useState({ code: "", name: "" });

	useEffect(() => {
		fetchLanguages();
	}, []);

	const fetchLanguages = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/languages");
			if (!response.ok) {
				throw new Error("Failed to fetch languages");
			}
			const data = await response.json();
			setLanguages(data.languages || []);
		} catch (error) {
			console.error("Error fetching languages:", error);
			toast.error("Failed to load languages");
		} finally {
			setLoading(false);
		}
	};

	const handleAddLanguage = async () => {
		if (!newLanguage.name) {
			toast.error("Please enter a language name");
			return;
		}

		// Auto-detect code if not set
		let codeToUse = newLanguage.code;
		if (!codeToUse) {
			codeToUse = findLanguageCode(newLanguage.name);
			if (!codeToUse) {
				toast.error(
					"Could not auto-detect language code. Please enter a 2-letter ISO 639-1 code manually (e.g., 'en', 'hi', 'fr')"
				);
				return;
			}
		}

		// Validate ISO 639-1 code format
		if (!/^[a-z]{2}$/i.test(codeToUse)) {
			toast.error(
				"Language code must be a valid ISO 639-1 code (2 letters, e.g., 'en', 'hi', 'fr')"
			);
			return;
		}

		try {
			setIsAdding(true);
			const response = await fetch("/api/languages", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					code: codeToUse.toLowerCase(),
					name: newLanguage.name,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to add language");
			}

			toast.success(data.message || "Language added successfully");
			setNewLanguage({ code: "", name: "" });
			setOpenDialog(false);
			// Refetch languages to get the updated list (including discovered languages)
			await fetchLanguages();
		} catch (error) {
			console.error("Error adding language:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to add language"
			);
		} finally {
			setIsAdding(false);
		}
	};

	const handleDeleteLanguage = async (code: string) => {
		if (!confirm(`Are you sure you want to delete language "${code}"?`)) {
			return;
		}

		try {
			setIsDeleting(code);
			const response = await fetch("/api/languages", {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ code }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to delete language");
			}

			toast.success(data.message || "Language deleted successfully");
			// Refetch languages to get the updated list (including discovered languages)
			await fetchLanguages();
		} catch (error) {
			console.error("Error deleting language:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to delete language"
			);
		} finally {
			setIsDeleting(null);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-end">
				<Button size="sm" onClick={() => setOpenDialog(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Add Language
				</Button>
			</div>
			<div className="border rounded-lg">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Language Code</TableHead>
							<TableHead>Language Name</TableHead>
							<TableHead className="w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{languages.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={3}
									className="text-center text-muted-foreground"
								>
									No languages found
								</TableCell>
							</TableRow>
						) : (
							languages.map((lang) => {
								const isDefault =
									lang.code === "en" ||
									lang.code === "hi" ||
									lang.code === "ta";
								const isDiscovered =
									!lang.isManuallyAdded && !isDefault;
								const canDelete =
									lang.isManuallyAdded && !isDefault;

								return (
									<TableRow key={lang.code}>
										<TableCell className="font-mono font-medium">
											{lang.code}
										</TableCell>
										<TableCell>
											{lang.name}
											{isDiscovered && (
												<span className="ml-2 text-xs text-muted-foreground">
													(discovered)
												</span>
											)}
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="icon"
												onClick={() =>
													handleDeleteLanguage(
														lang.code
													)
												}
												disabled={
													isDeleting === lang.code ||
													!canDelete
												}
												title={
													isDefault
														? "Cannot delete default languages"
														: isDiscovered
														? "Cannot delete discovered languages. Remove the language data from analysis records first."
														: "Delete language"
												}
											>
												{isDeleting === lang.code ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<Trash2 className="h-4 w-4" />
												)}
											</Button>
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</div>

			<Dialog open={openDialog} onOpenChange={setOpenDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add New Language</DialogTitle>
						<DialogDescription>
							Enter the language name and the code will be
							automatically detected. You can manually edit the
							code if needed.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">Language Name *</Label>
							<Input
								id="name"
								placeholder="e.g., French, German, Sanskrit, Tamil"
								value={newLanguage.name}
								onChange={(e) => {
									const name = e.target.value;
									const autoCode = findLanguageCode(name);
									setNewLanguage({
										name,
										code: autoCode || newLanguage.code,
									});
								}}
							/>
							<p className="text-xs text-muted-foreground">
								Enter the language name (e.g., "Sanskrit",
								"French", "Tamil")
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="code">Language Code *</Label>
							<Input
								id="code"
								placeholder="e.g., sa, fr, ta"
								value={newLanguage.code}
								onChange={(e) =>
									setNewLanguage((prev) => ({
										...prev,
										code: e.target.value.toLowerCase(),
									}))
								}
								maxLength={2}
								pattern="[a-z]{2}"
							/>
							<p className="text-xs text-muted-foreground">
								ISO 639-1 code (2 letters) - Auto-filled from
								name, but can be edited manually
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setOpenDialog(false);
								setNewLanguage({ code: "", name: "" });
							}}
							disabled={isAdding}
						>
							Cancel
						</Button>
						<Button onClick={handleAddLanguage} disabled={isAdding}>
							{isAdding ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
									Adding...
								</>
							) : (
								"Add Language"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
