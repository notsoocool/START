/** Books tree chapters may be plain strings or `{ chaptno, status }` after publish status. */
export type ChapterRef = string | { chaptno: string; status?: unknown };

export function chapterNo(chapter: ChapterRef): string {
	return typeof chapter === "string" ? chapter : String(chapter.chaptno);
}

export function chapterNos(chapters: ChapterRef[] | undefined | null): string[] {
	return (chapters ?? []).map(chapterNo);
}
