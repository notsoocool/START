"use client";

import { GripVertical } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ResizableTableHeadProps {
	columnId: string;
	width: number;
	onResizeStart: (columnId: string, startX: number) => void;
	children: React.ReactNode;
	className?: string;
}

export function ResizableTableHead({
	columnId,
	width,
	onResizeStart,
	children,
	className,
}: ResizableTableHeadProps) {
	return (
		<TableHead
			className={cn(
				"group/resize relative select-none overflow-visible border-r border-border/80 pr-4",
				className
			)}
			style={{ width, minWidth: width, maxWidth: width }}
		>
			<span className="block truncate pr-1">{children}</span>
			<TooltipProvider delayDuration={200}>
				<Tooltip>
					<TooltipTrigger asChild>
						<div
							role="separator"
							aria-orientation="vertical"
							aria-label={`Resize ${columnId} column`}
							className="absolute -right-2 top-0 z-20 flex h-full w-4 cursor-col-resize touch-none items-center justify-center"
							onMouseDown={(event) => {
								event.preventDefault();
								event.stopPropagation();
								onResizeStart(columnId, event.clientX);
							}}
						>
							<span className="flex h-6 w-3 items-center justify-center rounded-sm border border-border bg-muted/90 shadow-sm transition-colors group-hover/resize:border-primary/50 group-hover/resize:bg-primary/10 hover:border-primary hover:bg-primary/15">
								<GripVertical className="size-3 text-muted-foreground group-hover/resize:text-primary" />
							</span>
						</div>
					</TooltipTrigger>
					<TooltipContent side="top" className="text-xs">
						Drag to resize column
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</TableHead>
	);
}
