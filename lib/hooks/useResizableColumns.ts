"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDefaultAnalysisColumnWidth } from "@/lib/constants/analysisTableColumnWidths";

const MIN_COLUMN_WIDTH = 60;

export function useResizableColumns(
	storageKey: string,
	defaults: Record<string, number>
) {
	const [widths, setWidths] = useState<Record<string, number>>(defaults);
	const [loaded, setLoaded] = useState(false);
	const resizingRef = useRef<{
		columnId: string;
		startX: number;
		startWidth: number;
	} | null>(null);

	useEffect(() => {
		try {
			const stored = localStorage.getItem(storageKey);
			if (stored) {
				const parsed = JSON.parse(stored) as Record<string, number>;
				setWidths((prev) => ({ ...prev, ...parsed }));
			}
		} catch {
			// ignore invalid stored prefs
		}
		setLoaded(true);
	}, [storageKey]);

	useEffect(() => {
		if (!loaded) return;
		try {
			localStorage.setItem(storageKey, JSON.stringify(widths));
		} catch {
			// ignore storage errors
		}
	}, [widths, loaded, storageKey]);

	useEffect(() => {
		const onMouseMove = (event: MouseEvent) => {
			if (!resizingRef.current) return;
			const { columnId, startX, startWidth } = resizingRef.current;
			const nextWidth = Math.max(
				MIN_COLUMN_WIDTH,
				startWidth + (event.clientX - startX)
			);
			setWidths((prev) => ({ ...prev, [columnId]: nextWidth }));
		};

		const onMouseUp = () => {
			if (!resizingRef.current) return;
			resizingRef.current = null;
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};

		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
		return () => {
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};
	}, []);

	const getColumnWidth = useCallback(
		(columnId: string) =>
			widths[columnId] ??
			defaults[columnId] ??
			getDefaultAnalysisColumnWidth(columnId),
		[widths, defaults]
	);

	const getColumnStyle = useCallback(
		(columnId: string) => {
			const width = getColumnWidth(columnId);
			return {
				width,
				minWidth: width,
				maxWidth: width,
			} as const;
		},
		[getColumnWidth]
	);

	const startColumnResize = useCallback(
		(columnId: string, startX: number) => {
			resizingRef.current = {
				columnId,
				startX,
				startWidth: getColumnWidth(columnId),
			};
			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
		},
		[getColumnWidth]
	);

	return {
		getColumnWidth,
		getColumnStyle,
		startColumnResize,
	};
}
