"use client";

import { useEffect, useRef, useState } from "react";
import { usePageReady } from "@/components/ui/PageReadyContext";

export default function AddWordPage() {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [iframeHeight, setIframeHeight] = useState(800);
	const { setPageReady } = usePageReady();

	useEffect(() => {
		setPageReady(true);
	}, [setPageReady]);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			// Only accept messages from the Google Form
			if (event.origin !== "https://docs.google.com") return;

			// Google Forms sends height information
			if (event.data && typeof event.data === "string") {
				try {
					const data = JSON.parse(event.data);
					if (data.height) {
						setIframeHeight(data.height);
					}
				} catch (e) {
					// Ignore parsing errors
				}
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	return (
		<div className="w-full flex justify-center p-4">
			<iframe
				ref={iframeRef}
				src="https://docs.google.com/forms/d/e/1FAIpQLSec35rPL6Je8jL53mrG6-WX_AbjxniRD-nGFO2KQaGGcx85-w/viewform?embedded=true"
				width="640"
				height={iframeHeight}
				style={{ border: "none" }}
				title="Add Word Form"
			>
				Loading...
			</iframe>
		</div>
	);
}
