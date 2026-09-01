"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { KAARAKA_TAGS } from "@/lib/data/kaarakaTags";

interface KaarakaRelationComboboxProps {
	/** Current relation label for this pair slot (before the comma / to_index). */
	value: string;
	onChange: (nextRelation: string) => void;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
}

export function KaarakaRelationCombobox({
	value,
	onChange,
	disabled = false,
	placeholder = "Select Kaaraka Relation",
	className,
}: KaarakaRelationComboboxProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	const filteredTags = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return KAARAKA_TAGS;
		return KAARAKA_TAGS.filter(
			(tag) =>
				tag.long.toLowerCase().includes(q) ||
				tag.short.toLowerCase().includes(q)
		);
	}, [query]);

	const handleSelect = (selectedShort: string) => {
		onChange(selectedShort);
		setOpen(false);
		setQuery("");
	};

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				if (disabled) return;
				setOpen(next);
				if (!next) setQuery("");
			}}
		>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn(
						"w-[220px] justify-between bg-transparent font-normal hover:bg-transparent",
						!value && "text-muted-foreground",
						className
					)}
				>
					<span className="truncate text-left">
						{value || placeholder}
					</span>
					<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[320px] p-0"
				align="start"
				onOpenAutoFocus={(e) => {
					// Keep the outer button from stealing focus back so the
					// search input inside gets it instead.
					e.preventDefault();
				}}
			>
				<div className="border-b p-2">
					<Input
						autoFocus
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search relation (short or long)..."
						className="h-8"
					/>
				</div>
				<div className="max-h-72 overflow-y-auto py-1">
					{filteredTags.length === 0 ? (
						<div className="px-3 py-6 text-center text-sm text-muted-foreground">
							No matching relations.
						</div>
					) : (
						filteredTags.map((tag) => {
							const isSelected =
								value === tag.short || value === tag.long;
							return (
								<button
									key={`${tag.long}-${tag.short}`}
									type="button"
									onClick={() => handleSelect(tag.short)}
									className={cn(
										"flex w-full items-center justify-between gap-3 px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
										isSelected && "bg-accent/50"
									)}
								>
									<span className="flex-1 truncate text-left font-medium">
										{tag.short}
									</span>
									<span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
										{tag.long}
									</span>
									<Check
										className={cn(
											"ml-1 size-4 shrink-0",
											isSelected
												? "opacity-100"
												: "opacity-0"
										)}
									/>
								</button>
							);
						})
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
