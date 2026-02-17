"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { createNoise3D } from "simplex-noise";

export const WavyBackground = ({
	children,
	className,
	containerClassName,
	colors,
	waveWidth,
	backgroundFill,
	blur = 10,
	speed = "fast",
	waveOpacity = 0.5,
	...props
}: {
	children?: React.ReactNode;
	className?: string;
	containerClassName?: string;
	colors?: string[];
	waveWidth?: number;
	backgroundFill?: string;
	blur?: number;
	speed?: "slow" | "fast";
	waveOpacity?: number;
	[key: string]: unknown;
}) => {
	const noise = createNoise3D();
	let w: number,
		h: number,
		nt: number,
		i: number,
		x: number,
		ctx: CanvasRenderingContext2D | null,
		canvas: HTMLCanvasElement | null;
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const getSpeed = () => {
		switch (speed) {
			case "slow":
				return 0.001;
			case "fast":
				return 0.002;
			default:
				return 0.001;
		}
	};

	const init = () => {
		canvas = canvasRef.current;
		if (!canvas || !containerRef.current) return;
		ctx = canvas.getContext("2d");
		if (!ctx) return;

		const rect = containerRef.current.getBoundingClientRect();
		w = ctx.canvas.width = rect.width;
		h = ctx.canvas.height = rect.height;
		ctx.filter = `blur(${blur}px)`;
		nt = 0;

		const handleResize = () => {
			if (!containerRef.current || !ctx || !canvas) return;
			const r = containerRef.current.getBoundingClientRect();
			w = ctx.canvas.width = canvas.width = r.width;
			h = ctx.canvas.height = canvas.height = r.height;
			ctx.filter = `blur(${blur}px)`;
		};

		window.addEventListener("resize", handleResize);

		// Slant angle: top-right to bottom-right (~-10 degrees)
		const slantDeg = -10;
		const slantRad = (slantDeg * Math.PI) / 180;

		let animationId: number;
		const render = () => {
			if (!ctx) return;
			ctx.fillStyle = backgroundFill || "black";
			ctx.globalAlpha = waveOpacity || 0.5;
			ctx.fillRect(0, 0, w, h);
			const waveColors = colors ?? [
				"#38bdf8",
				"#818cf8",
				"#c084fc",
				"#e879f9",
				"#22d3ee",
			];
			nt += getSpeed();

			// Rotate so waves run diagonally (top-right to bottom-left, like slant stairs)
			ctx.save();
			ctx.translate(w / 2, h / 2);
			ctx.rotate(slantRad);
			ctx.translate(-w / 2, -h / 2);

			// Draw over extended range so rotated waves cover the canvas
			const drawW = w * 2;
			const drawStart = -w / 2;
			for (i = 0; i < 5; i++) {
				ctx.beginPath();
				ctx.lineWidth = waveWidth || 50;
				ctx.strokeStyle = waveColors[i % waveColors.length];
				for (x = drawStart; x < drawStart + drawW; x += 5) {
					const y = noise(x / 800, 0.3 * i, nt) * 100;
					ctx.lineTo(x, y + h * 0.5);
				}
				ctx.stroke();
				ctx.closePath();
			}
			ctx.restore();

			animationId = requestAnimationFrame(render);
		};
		render();

		return () => {
			window.removeEventListener("resize", handleResize);
			cancelAnimationFrame(animationId);
		};
	};

	useEffect(() => {
		const cleanup = init();
		return () => cleanup?.();
	}, [blur, speed, waveOpacity, backgroundFill, waveWidth, colors]);

	const [isSafari, setIsSafari] = useState(false);
	useEffect(() => {
		setIsSafari(
			typeof window !== "undefined" &&
				navigator.userAgent.includes("Safari") &&
				!navigator.userAgent.includes("Chrome")
		);
	}, []);

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative flex h-full min-h-full w-full flex-col items-center justify-center overflow-hidden",
				containerClassName
			)}
		>
			<canvas
				className="absolute inset-0 z-0"
				ref={canvasRef}
				id="canvas"
				style={{
					...(isSafari ? { filter: `blur(${blur}px)` } : {}),
				}}
			/>
			<div className={cn("relative z-10", className)} {...props}>
				{children}
			</div>
		</div>
	);
};
