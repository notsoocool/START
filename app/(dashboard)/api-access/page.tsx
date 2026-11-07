"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Copy, KeyRound, BookOpen, CircleHelp } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TreeNode } from "@/types/treeNode";

const ANALYSIS_FIELD_IDS =
	"anvaya_no,word,poem,sandhied_word,morph_analysis,morph_in_context,kaaraka_sambandha,possible_relations,hindi_meaning,english_meaning,sentno,chaptno,slokano,book,part1,part2,padacchedah,anvaya";
const SHLOKA_FIELD_IDS =
	"slokano,chaptno,spart,userPublished,groupPublished,locked,owner,book,part1,part2";

type KeyStatus = {
	status: "none" | "active" | "revoked";
	keyPrefix?: string;
	createdAt?: string;
	lastUsedAt?: string | null;
};

type AccessRequest = {
	_id: string;
	books: string[];
	note?: string;
	status: "pending" | "approved" | "rejected";
	createdAt: string;
	reviewNote?: string | null;
};

type BookGrant = {
	_id: string;
	book: string;
	grantedAt: string;
};

export default function ApiAccessPage() {
	const router = useRouter();
	const { data: currentUser, isLoading: userLoading } = useCurrentUser();
	const allowed =
		currentUser?.perms === "Developer" ||
		currentUser?.perms === "Admin" ||
		currentUser?.perms === "Root";

	const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
	const [rawKey, setRawKey] = useState<string | null>(null);
	const [requests, setRequests] = useState<AccessRequest[]>([]);
	const [grants, setGrants] = useState<BookGrant[]>([]);
	const [books, setBooks] = useState<string[]>([]);
	const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
	const [note, setNote] = useState("");
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [helpOpen, setHelpOpen] = useState(false);

	useEffect(() => {
		if (userLoading) return;
		if (!currentUser) {
			router.push("/");
			return;
		}
		if (!allowed) {
			toast.error("API Access is only for Developers");
			router.push("/");
		}
	}, [userLoading, currentUser, allowed, router]);

	const load = async () => {
		setLoading(true);
		try {
			const [keyRes, reqRes, booksRes] = await Promise.all([
				fetch("/api/developer/key"),
				fetch("/api/developer/requests"),
				fetch("/api/books"),
			]);
			if (!keyRes.ok || !reqRes.ok) {
				throw new Error("Failed to load API access data");
			}
			const keyData = await keyRes.json();
			const reqData = await reqRes.json();
			setKeyStatus(keyData);
			setRequests(reqData.requests || []);
			setGrants(reqData.grants || []);
			if (booksRes.ok) {
				const tree: TreeNode[] = await booksRes.json();
				setBooks(tree.map((b) => b.book).filter(Boolean).sort((a, b) => a.localeCompare(b)));
			}
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (allowed) void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [allowed]);

	const sampleBook = useMemo(
		() => grants[0]?.book || selectedBooks[0] || "BOOK_NAME",
		[grants, selectedBooks]
	);
	const encodedBook = useMemo(() => encodeURIComponent(sampleBook), [sampleBook]);

	const exampleCurlAnalysis = useMemo(
		() =>
			`curl -H "Authorization: Bearer YOUR_KEY" \\
  "https://start.samsaadhanii.in/api/download?book=${encodedBook}&part1=&part2=&format=json&dataType=analysis&analysisFields=word,chaptno,slokano,sentno,anvaya_no,english_meaning"`,
		[encodedBook]
	);
	const exampleCurlShloka = useMemo(
		() =>
			`curl -H "Authorization: Bearer YOUR_KEY" \\
  "https://start.samsaadhanii.in/api/download?book=${encodedBook}&part1=&part2=&format=json&dataType=shloka&shlokaFields=slokano,chaptno,spart,book"`,
		[encodedBook]
	);
	const exampleCurlBoth = useMemo(
		() =>
			`curl -H "Authorization: Bearer YOUR_KEY" \\
  "https://start.samsaadhanii.in/api/download?book=${encodedBook}&part1=&part2=&format=json&dataType=both&analysisFields=word,chaptno,slokano,sentno&shlokaFields=slokano,chaptno,spart"`,
		[encodedBook]
	);

	const generateKey = async () => {
		setBusy(true);
		try {
			const response = await fetch("/api/developer/key", { method: "POST" });
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Failed to generate key");
			setRawKey(data.rawKey);
			setKeyStatus({
				status: "active",
				keyPrefix: data.keyPrefix,
				createdAt: data.createdAt,
			});
			toast.success("API key created. Copy it now — it will not be shown again.");
			setConfirmOpen(false);
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			setBusy(false);
		}
	};

	const revokeKey = async () => {
		setBusy(true);
		try {
			const response = await fetch("/api/developer/key", { method: "DELETE" });
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Failed to revoke key");
			setRawKey(null);
			await load();
			toast.success("API key revoked");
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			setBusy(false);
		}
	};

	const submitRequest = async () => {
		if (selectedBooks.length < 1) {
			toast.error("Select at least one book");
			return;
		}
		setBusy(true);
		try {
			const response = await fetch("/api/developer/requests", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ books: selectedBooks, note }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Failed to submit request");
			toast.success("Book access request submitted");
			setSelectedBooks([]);
			setNote("");
			await load();
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			setBusy(false);
		}
	};

	const toggleBook = (book: string) => {
		setSelectedBooks((current) =>
			current.includes(book) ? current.filter((b) => b !== book) : [...current, book]
		);
	};

	if (userLoading || !allowed) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="mx-auto my-8 max-w-5xl space-y-6 px-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">API Access</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Generate a personal read-only key and request books. Access starts only after
						Admin approval. Data is under CC BY-NC-SA.
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}>
					<CircleHelp className="mr-1.5 h-4 w-4" />
					Help
				</Button>
			</div>

			{loading ? (
				<div className="flex justify-center py-16">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : (
				<>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<KeyRound className="h-5 w-5" />
								API key
							</CardTitle>
							<CardDescription>
								One active key per account. Regenerating revokes the previous key.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">
									{keyStatus?.status === "active"
										? "Active"
										: keyStatus?.status === "revoked"
											? "Revoked"
											: "No key"}
								</Badge>
								{keyStatus?.keyPrefix && (
									<span className="font-mono text-sm text-muted-foreground">
										{keyStatus.keyPrefix}…
									</span>
								)}
							</div>
							{rawKey && (
								<div className="rounded-md border bg-muted/40 p-3">
									<p className="mb-2 text-xs font-medium text-amber-700 dark:text-amber-300">
										Copy this key now. It will not be shown again.
									</p>
									<div className="flex items-start gap-2">
										<code className="flex-1 break-all text-sm">{rawKey}</code>
										<Button
											size="sm"
											variant="outline"
											onClick={async () => {
												await navigator.clipboard.writeText(rawKey);
												toast.success("Copied");
											}}
										>
											<Copy className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
							<div className="flex flex-wrap gap-2">
								<Button onClick={() => setConfirmOpen(true)} disabled={busy}>
									{keyStatus?.status === "active" ? "Regenerate key" : "Generate key"}
								</Button>
								{keyStatus?.status === "active" && (
									<Button variant="outline" onClick={revokeKey} disabled={busy}>
										Revoke key
									</Button>
								)}
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<BookOpen className="h-5 w-5" />
								Request book access
							</CardTitle>
							<CardDescription>
								Your key can download a book only after an Admin approves it.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
								{books.map((book) => (
									<label key={book} className="flex items-center gap-2 text-sm">
										<Checkbox
											checked={selectedBooks.includes(book)}
											onCheckedChange={() => toggleBook(book)}
										/>
										<span>{book}</span>
									</label>
								))}
							</div>
							<Textarea
								placeholder="Optional note (e.g. Isha, Kena, Katha for reader site)"
								value={note}
								onChange={(e) => setNote(e.target.value)}
							/>
							<Button onClick={submitRequest} disabled={busy || selectedBooks.length < 1}>
								Submit request
							</Button>
						</CardContent>
					</Card>

					<div className="grid gap-6 md:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">My requests</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{requests.length === 0 ? (
									<p className="text-sm text-muted-foreground">No requests yet.</p>
								) : (
									requests.map((request) => (
										<div key={request._id} className="rounded-md border p-3 text-sm">
											<div className="mb-1 flex items-center justify-between gap-2">
												<Badge variant="outline">{request.status}</Badge>
												<span className="text-xs text-muted-foreground">
													{new Date(request.createdAt).toLocaleString()}
												</span>
											</div>
											<p>{request.books.join(", ")}</p>
											{request.note && (
												<p className="mt-1 text-muted-foreground">{request.note}</p>
											)}
										</div>
									))
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Approved books</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								{grants.length === 0 ? (
									<p className="text-sm text-muted-foreground">No approved books yet.</p>
								) : (
									grants.map((grant) => (
										<div key={grant._id} className="rounded-md border px-3 py-2 text-sm">
											{grant.book}
										</div>
									))
								)}
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Usage</CardTitle>
							<CardDescription>
								<code className="rounded bg-muted px-1">dataType</code> can be{" "}
								<code className="rounded bg-muted px-1">analysis</code>,{" "}
								<code className="rounded bg-muted px-1">shloka</code>, or{" "}
								<code className="rounded bg-muted px-1">both</code>. Field lists are required.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4 text-sm">
							<p>
								Send your key as{" "}
								<code className="rounded bg-muted px-1">Authorization: Bearer &lt;key&gt;</code>{" "}
								or <code className="rounded bg-muted px-1">X-API-Key: &lt;key&gt;</code>.
							</p>
							<div className="space-y-2">
								<p className="font-medium">Analysis</p>
								<pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
									{exampleCurlAnalysis}
								</pre>
							</div>
							<div className="space-y-2">
								<p className="font-medium">Shloka</p>
								<pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
									{exampleCurlShloka}
								</pre>
							</div>
							<div className="space-y-2">
								<p className="font-medium">Both</p>
								<pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
									{exampleCurlBoth}
								</pre>
							</div>
							<p className="text-muted-foreground">
								Credit line: Word analyses: Sanskrit Knowledge Accessor (Samsaadhanii), —
								Samsaadhanii Team. Link: https://start.samsaadhanii.in. License: CC BY-NC-SA.
							</p>
						</CardContent>
					</Card>
				</>
			)}

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{keyStatus?.status === "active" ? "Regenerate API key?" : "Generate API key?"}
						</DialogTitle>
						<DialogDescription>
							{keyStatus?.status === "active"
								? "The current key will stop working immediately."
								: "The raw key is shown only once after creation."}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>
							Cancel
						</Button>
						<Button onClick={generateKey} disabled={busy}>
							{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={helpOpen} onOpenChange={setHelpOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>API Access help</DialogTitle>
						<DialogDescription>
							How keys, book approval, and <code>/api/download</code> work.
						</DialogDescription>
					</DialogHeader>
					<ScrollArea className="max-h-[70vh] pr-4">
						<div className="space-y-5 text-sm">
							<section className="space-y-2">
								<h3 className="font-semibold">1. Get access</h3>
								<ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
									<li>Generate an API key (shown only once — copy it).</li>
									<li>Request the books you need.</li>
									<li>Wait for Admin approval. Your key only works for approved books.</li>
								</ol>
							</section>

							<section className="space-y-2">
								<h3 className="font-semibold">2. Authenticate</h3>
								<p className="text-muted-foreground">
									Every download needs your key in one of these headers:
								</p>
								<pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
									{`Authorization: Bearer YOUR_KEY
# or
X-API-Key: YOUR_KEY`}
								</pre>
							</section>

							<section className="space-y-2">
								<h3 className="font-semibold">3. Endpoint</h3>
								<pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
									{`GET https://start.samsaadhanii.in/api/download`}
								</pre>
							</section>

							<section className="space-y-2">
								<h3 className="font-semibold">4. Query parameters</h3>
								<ul className="list-disc space-y-1 pl-5 text-muted-foreground">
									<li>
										<code className="text-foreground">book</code> — exact approved book name
										(required). <code className="text-foreground">book=all</code> is blocked for
										developer keys.
									</li>
									<li>
										<code className="text-foreground">part1</code> /{" "}
										<code className="text-foreground">part2</code> — use empty string for books
										without parts, or a specific part name / <code className="text-foreground">all</code>.
									</li>
									<li>
										<code className="text-foreground">chapter</code> /{" "}
										<code className="text-foreground">slokano</code> — optional filters when narrowing
										further.
									</li>
									<li>
										<code className="text-foreground">format</code> — <code className="text-foreground">json</code>{" "}
										(default) or <code className="text-foreground">csv</code>.
									</li>
									<li>
										<code className="text-foreground">dataType</code> —{" "}
										<code className="text-foreground">analysis</code> (default),{" "}
										<code className="text-foreground">shloka</code>, or{" "}
										<code className="text-foreground">both</code>.
									</li>
									<li>
										<code className="text-foreground">analysisFields</code> — comma-separated; required
										when dataType is analysis or both.
									</li>
									<li>
										<code className="text-foreground">shlokaFields</code> — comma-separated; required
										when dataType is shloka or both.
									</li>
								</ul>
							</section>

							<section className="space-y-2">
								<h3 className="font-semibold">5. Available fields</h3>
								<p className="text-muted-foreground">Analysis:</p>
								<pre className="overflow-x-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs">
									{ANALYSIS_FIELD_IDS}
								</pre>
								<p className="text-muted-foreground">Shloka:</p>
								<pre className="overflow-x-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs">
									{SHLOKA_FIELD_IDS}
								</pre>
							</section>

							<section className="space-y-2">
								<h3 className="font-semibold">6. Examples</h3>
								<p className="font-medium">Analysis</p>
								<pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
									{exampleCurlAnalysis}
								</pre>
								<p className="font-medium">Shloka</p>
								<pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
									{exampleCurlShloka}
								</pre>
								<p className="font-medium">Both</p>
								<pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
									{exampleCurlBoth}
								</pre>
							</section>

							<section className="space-y-2">
								<h3 className="font-semibold">7. Common errors</h3>
								<ul className="list-disc space-y-1 pl-5 text-muted-foreground">
									<li>
										<code className="text-foreground">401</code> — missing/invalid key
									</li>
									<li>
										<code className="text-foreground">403</code> — book not approved, or{" "}
										<code className="text-foreground">book=all</code>
									</li>
									<li>
										<code className="text-foreground">400</code> — missing{" "}
										<code className="text-foreground">book</code> / fields for the chosen dataType
									</li>
								</ul>
							</section>

							<section className="space-y-2">
								<h3 className="font-semibold">8. License</h3>
								<p className="text-muted-foreground">
									Data is CC BY-NC-SA. Credit: Word analyses: Sanskrit Knowledge Accessor
									(Samsaadhanii), — Samsaadhanii Team. Link: https://start.samsaadhanii.in.
								</p>
							</section>
						</div>
					</ScrollArea>
					<DialogFooter>
						<Button onClick={() => setHelpOpen(false)}>Close</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
