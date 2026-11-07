export type ApiAccessEvent = {
	userId: string;
	keyPrefix: string;
	book: string;
	route: string;
	status: number;
	ip: string | null;
	userAgent: string | null;
	durationMs: number;
	timestamp?: string;
};

export async function logApiAccess(event: ApiAccessEvent): Promise<void> {
	const token = process.env.AXIOM_TOKEN;
	const dataset = process.env.AXIOM_DATASET;
	if (!token || !dataset) return;

	try {
		await fetch(`https://api.axiom.co/v1/datasets/${dataset}/ingest`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify([
				{
					...event,
					timestamp: event.timestamp ?? new Date().toISOString(),
				},
			]),
		});
	} catch (error) {
		console.error("Axiom ingest failed:", error);
	}
}
