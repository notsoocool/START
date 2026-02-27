/**
 * Sanity check for analysis data.
 * Validates kaaraka_sambandha, morph_in_context, bgcolor, and related fields.
 */

// Valid strings for kaaraka_sambandha and possible_relations (from valid_strings.txt)
export const VALID_STRINGS = new Set(
	[
		"नित्य_सम्बन्धः",
		"नित्य_सम्बन्धः1",
		"प्रतियोगी",
		"भावलक्षणसप्तमी_समानकालः",
		"भावलक्षणसप्तमी_पूर्वकालः",
		"भावलक्षणसप्तमी_अनन्तरकालः",
		"कर्ता_बे_वेर्ब्स्",
		"कर्ता",
		"कर्तृरहितकर्तृसमानाधिकरणम्",
		"विधेय_विशेषणम्",
		"मुख्यकर्म",
		"गौणकर्म",
		"वाक्यकर्म",
		"कर्मसमानाधिकरणम्",
		"कर्म",
		"प्रयोजककर्ता",
		"प्रयोज्यकर्ता",
		"मध्यस्थकर्ता",
		"करणम्",
		"सम्प्रदानम्",
		"अपादानम्",
		"विषयाधिकरणम्",
		"देशाधिकरणम्",
		"कालाधिकरणम्",
		"अधिकरणम्",
		"पूर्वकालः",
		"क्रियाविशेषणम्",
		"निर्धारणम्",
		"सम्बन्धः",
		"अनन्तरकालः",
		"सम्बोधन_द्योतकः",
		"समुच्चितः",
		"सुप्_समुच्चितः",
		"अन्यतरः",
		"सुप्_अन्यतरः",
		"विशेषणम्",
		"अभेदः",
		"षष्ठीसम्बन्धः",
		"हेतुः",
		"हेतुः5",
		"प्रयोजनम्1",
		"प्रयोजनम्",
		"वर्तमानसमानकालः",
		"सन्दर्भ_बिन्दुः",
		"तुलना_बिन्दुः",
		"समुच्चय_द्योतकः",
		"सुप्_समुच्चय_द्योतकः",
		"अन्यतर_द्योतकः",
		"सुप्_अन्यतर_द्योतकः",
		"सम्बोध्यः",
		"प्रतिषेधः",
		"तीव्रतादर्शी",
		"सञ्ज्ञा_द्योतकः",
		"सञ्ज्ञा",
		"घटक",
		"घटक_द्योतकः",
		"कारण_द्योतकः",
		"कार्य_द्योतकः",
		"व्यभिचारः",
		"व्यभिचार_द्योतकः",
		"कार्य_कारण_भावः",
		"प्रयोजककर्तृरहितप्रयोज्यकर्ता",
		"विरोधकः",
		"विरोध_द्योतकः",
		"समासः",
		"समानकालः",
		"प्रयोजनम्_द्योतकः",
		"सहार्थ_द्योतकः",
		"विनार्थ_द्योतकः",
		"ल्यप्कर्माधिकरणम्",
		"उपमानम्",
		"उपमान_द्योतकः",
		"तुमुन्कर्म",
		"वीप्सा",
		"अपादानम्_वीप्सा",
		"करणम्_वीप्सा",
		"उद्गारवाचकः",
		"स्वामी",
		"अध्याहृतक्रियाकर्म",
		"अङ्गविकारः",
		"उत्प्रेक्षा_द्योतकः",
		"ऽअवधिः",
		"सहार्थः",
		"विनार्थः",
		"आरम्भ_बिन्दुः",
		"आभिमुख्यम्",
		"अपवर्ग_सम्बन्धः",
		"वाक्यकर्म_द्योतकः",
		"ऽइत्थम्भूतः",
		"अत्यन्तसंयोगः",
		"उप_अपेक्षा",
		"उप_कर्म",
		"उप_कर्मप्रवचनीयः",
		"उप_आभिमुख्यम्",
		"उप_निर्धारणम्",
		"उप_प्रतिसिद्धः",
		"उप_आरम्भ_बिन्दुः",
		"उप_स्वामी",
		"उप_विना",
		"उप_विषयाधिकरणम्",
		"अपादानम्_उप",
		"देशाधिकरणम्_उप",
		"कर्तृसमानाधिकरणम्_उप",
		"सम्बन्ध_उप",
		"कर्ता_उप",
		"अधिकरणम्_उप",
		"गतिकर्ता",
		"गतिकर्म",
		"भ्कर्ता",
		"भ्कर्म",
		"इष्कर्म",
		"आवश्यकता_द्योतकः",
		"परिणाम_द्योतकः",
		"आवश्यकता_परिणाम_सम्बन्धः",
		"समानाधिकरणम्",
		"उपमानम्_रहित_उपमान_द्योतकः",
		"वाक्यार्थः",
		"वाक्यार्थ_द्योतकः",
		"आभिमुख्य_द्योतकः",
		"भावलक्षणसप्तमी",
		"परामर्शः",
		"अव्ययीभावः",
		"तत्पुरुषः",
		"प्रथमा-तत्पुरुषः",
		"द्वितीया-तत्पुरुषः",
		"तृतीया-तत्पुरुषः",
		"चतुर्थी-तत्पुरुषः",
		"पञ्चमी-तत्पुरुषः",
		"षष्ठी-तत्पुरुषः",
		"सप्तमी-तत्पुरुषः",
		"नञ्-तत्पुरुषः",
		"उपपद-तत्पुरुषः",
		"कर्मधारयः",
		"समाहार-द्विगुः",
		"द्वन्द्वः",
		"इतरेतर-द्वन्द्वः",
		"समाहार-द्वन्द्वः",
		"बहुव्रीहिः",
		"द्वितीयार्थ-बहुव्रीहिः",
		"तृतीयार्थ-बहुव्रीहिः",
		"चतुर्थ्यर्थ-बहुव्रीहिः",
		"पञ्चम्यर्थ-बहुव्रीहिः",
		"षष्ठ्यर्थ-बहुव्रीहिः",
		"सप्तम्यर्थ-बहुव्रीहिः",
		"अस्त्यर्थ-मध्यमपदलोपी(नञ्)-बहुव्रीहिः",
		"केवलसमासः",
		"विभक्तम्",
	].map((s) => s.trim())
);

const VALID_BGCOLORS = new Set([
	"N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8", "NA", "KP", "CP",
]);

const COLORS: Record<string, string> = {
	N1: "#00BFFF", N2: "#93DB70", N3: "#40E0D0", N4: "#B0E2FF",
	N5: "#B4FFB4", N6: "#87CEEB", N7: "#C6E2EB", N8: "#6FFFC3",
	NA: "#FF99FF", KP: "#FF1975", CP: "#FFFF00",
};

const HEX_TO_NUMBER: Record<string, string> = {
	"#00BFFF": "1", "#93DB70": "2", "#40E0D0": "3", "#B0E2FF": "4",
	"#B4FFB4": "5", "#87CEEB": "6", "#C6E2EB": "7", "#6FFFC3": "8",
};

function normalizeBgcolor(bgcolor: string): string {
	return COLORS[bgcolor] ?? bgcolor;
}

function bgcolorHasNumber(bgcolor: string, num: string): boolean {
	const norm = normalizeBgcolor(bgcolor);
	if (HEX_TO_NUMBER[norm] === num) return true;
	return bgcolor.includes(num) || norm.includes(num);
}

// Morph tags that map to specific colors
const MORPH_TO_COLOR: Record<string, string> = {
	"{अव्य}": "NA",
	"{अव्यय}": "NA",
	"कर्तरि": "KP",
	"कर्मणि": "KP",
	"भावे": "KP",
};

export interface AnalysisRow {
	anvaya_no?: string;
	word?: string;
	slokano?: string;
	sentno?: string;
	chaptno?: string;
	part1?: string | null;
	part2?: string | null;
	book?: string;
	morph_in_context?: string;
	kaaraka_sambandha?: string;
	possible_relations?: string;
	bgcolor?: string;
	_line_number?: number;
	[key: string]: unknown;
}

export interface SanityError {
	slokano?: string;
	sentno?: string;
	anvaya_no?: string;
	message: string;
}

export interface SanityResult {
	errors: SanityError[];
	valid: boolean;
	totalRows: number;
}

function parseKaarakaEntries(str: string, separator: string): Array<{ relation: string; ref: string }> {
	if (!str || str === "-") return [];
	return str
		.split(separator)
		.map((e) => e.trim())
		.filter(Boolean)
		.map((entry) => {
			const commaIdx = entry.indexOf(",");
			if (commaIdx < 0) return { relation: entry.trim(), ref: "" };
			return {
				relation: entry.slice(0, commaIdx).trim(),
				ref: entry.slice(commaIdx + 1).trim(),
			};
		});
}

function extractVibhakti(morph: string): number | null {
	const m = morph.match(/\{(प्रथमा|द्वितीया|तृतीया|चतुर्थी|पञ्चमी|षष्ठी|सप्तमी)/);
	if (!m) return null;
	const map: Record<string, number> = {
		प्रथमा: 1, द्वितीया: 2, तृतीया: 3, चतुर्थी: 4,
		पञ्चमी: 5, षष्ठी: 6, सप्तमी: 7,
	};
	return map[m[1]] ?? null;
}

// Extract vibhakti numbers (1-8) from morph - Python pattern (?:पुं;|स्त्री;|नपुं;)(\d+);
const MORPH_VIBHAKTI_PATTERN = /(?:पुं;|स्त्री;|नपुं;)([1-8]);/g;

function extractIntegersFromMorph(morph: string): string[] {
	const fromPattern = Array.from(morph.matchAll(MORPH_VIBHAKTI_PATTERN), (m) => m[1]);
	const fromVibhakti = (() => {
		const v = extractVibhakti(morph);
		return v ? [String(v)] : [];
	})();
	return Array.from(new Set([...fromPattern, ...fromVibhakti]));
}

function extractN1toN8(morph: string): string[] {
	const matches = morph.match(/N[1-8]/g);
	return matches ? Array.from(new Set(matches)) : [];
}

function pushErr(
	errors: SanityError[],
	slokano: string,
	sentno: string,
	anvaya: string,
	msg: string
) {
	errors.push({ slokano, sentno, anvaya_no: anvaya, message: msg });
}

function findRow(
	data: AnalysisRow[],
	anvayaNo: string,
	sentno: string,
	slokano: string
): AnalysisRow | undefined {
	return data.find(
		(d) =>
			String(d.anvaya_no ?? "") === anvayaNo &&
			d.sentno === sentno &&
			d.slokano === slokano
	);
}

function checkKartaSambandha(
	kaaraka: string,
	morph: string,
	data: AnalysisRow[],
	sentno: string,
	slokano: string,
	errors: SanityError[]
) {
	const match = kaaraka.match(/कर्ता,(\d+\.\d+(?:\.\d+)?)/);
	if (!match || kaaraka.includes("अभिहित_कर्ता")) return;
	const targetIndex = match[1];
	const target = findRow(data, targetIndex, sentno, slokano);
	if (!target) return;
	const targetMorph = String(target.morph_in_context ?? "");

	if (morph.includes("1") && !/क्तवतु|क्त|कर्तरि/.test(targetMorph)) {
		pushErr(errors, slokano, sentno, "", `कर्ता present but target does not have कर्तरि or क्तवतु or क्त`);
	} else if (morph.includes("3") && !/कर्मणि|क्त|तव्यत्|अनीयर्/.test(targetMorph)) {
		pushErr(errors, slokano, sentno, "", `कर्ता present but target does not have कर्मणि or क्त or तव्यत् or अनीयर्`);
	} else if (morph.includes("6") && !/ल्युट्|घञ्/.test(targetMorph)) {
		pushErr(errors, slokano, sentno, "", `कर्ता present but target does not have ल्युट् or घञ्`);
	}
}

function kaarakaMatchesPossible(kaarakaItem: string, possibleList: Array<{ relation: string; ref: string }>): boolean {
	const commaIdx = kaarakaItem.indexOf(",");
	if (commaIdx < 0) return false;
	const rel = kaarakaItem.slice(0, commaIdx).trim();
	const ref = kaarakaItem.slice(commaIdx + 1).trim();
	if (!rel || !ref) return false;
	return possibleList.some((p) => {
		if (p.ref !== ref) return false;
		const pRel = p.relation;
		return (
			pRel === rel ||
			pRel.startsWith(`सुप्_${rel}`) ||
			new RegExp(`^${escapeRegex(rel)}\\d+`).test(pRel)
		);
	});
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function runSanityCheck(rows: AnalysisRow[]): SanityResult {
	const errors: SanityError[] = [];
	const anvayaSet = new Set<string>();
	const referencedAnvayas = new Set<string>();

	const data = rows;

	for (let i = 0; i < data.length; i++) {
		const row = data[i];
		const anvaya = String(row.anvaya_no ?? "").trim();
		const slokano = String(row.slokano ?? "").trim();
		const sentno = String(row.sentno ?? "").trim();
		const morph = String(row.morph_in_context ?? "").trim();
		const kaaraka = String(row.kaaraka_sambandha ?? "").trim();
		const possible = String(row.possible_relations ?? "").trim();
		const bgcolor = String(row.bgcolor ?? "").trim();
		const word = String(row.word ?? "").trim();

		anvayaSet.add(anvaya);

		// Extra spaces in any field
		for (const [field, value] of Object.entries(row)) {
			if (typeof value === "string" && (/\s{2,}/.test(value) || value !== value.trim())) {
				pushErr(errors, slokano, sentno, anvaya, `Extra spaces in field '${field}'`);
			}
		}

		// Skip most checks for placeholder words (but still track refs)
		if (["-", "", "."].includes(word)) {
			// Still collect referenced anvayas from kaaraka
			const kaarakaEntries = parseKaarakaEntries(kaaraka, kaaraka.includes("#") ? "#" : ";");
			for (const { ref } of kaarakaEntries) if (ref) referencedAnvayas.add(ref);
			continue;
		}

		// Word ending with "-": anvaya X.Y or X.Y.Z must have prefix. in kaaraka_sambandha
		if (/^\d+\.\d+(\.\d+)?$/.test(anvaya) && word.endsWith("-")) {
			const prefix = anvaya.split(".")[0];
			if (!kaaraka.includes(`${prefix}.`)) {
				pushErr(errors, slokano, sentno, anvaya, `kaaraka_sambandha should contain ${prefix}.any_number when word ends with "-"`);
			}
		}

		// Rows with "अभिहित" → skip all further checks (matches Python)
		if (kaaraka.includes("अभिहित")) {
			const kaarakaEntries = parseKaarakaEntries(kaaraka, ";");
			for (const { ref } of kaarakaEntries) if (ref) referencedAnvayas.add(ref);
			continue;
		}

		// check_kaaraka_sambandha (कर्ता target validation)
		checkKartaSambandha(kaaraka, morph, data, sentno, slokano, errors);

		// Hanging node (Python def): kaaraka is "-" or "" and never referenced by others in same sentno/slokano
		if (kaaraka === "-" || kaaraka === "") {
			const isReferenced = data.some(
				(d) =>
					d !== row &&
					d.sentno === sentno &&
					d.slokano === slokano &&
					String(d.kaaraka_sambandha ?? "").includes(anvaya)
			);
			if (!isReferenced) {
				pushErr(errors, slokano, sentno, anvaya, "Hanging node detected");
			}
		}

		// "/" in morph_in_context
		if (morph.includes("/")) {
			pushErr(errors, slokano, sentno, anvaya, "morph_in_context contains '/'");
		}

		// "#" in kaaraka_sambandha (should use ; not #)
		if (kaaraka.includes("#")) {
			pushErr(errors, slokano, sentno, anvaya, "kaaraka_sambandha contains '#'");
		}

		// Self loop: anvaya_no appears in its own kaaraka_sambandha
		const selfLoopRe = new RegExp(`\\b${escapeRegex(anvaya)}\\b`);
		if (selfLoopRe.test(kaaraka)) {
			pushErr(errors, slokano, sentno, anvaya, "Self loop detected");
		}

		// bgcolor validity (N1-N8, NA, KP, CP or hex)
		if (bgcolor && bgcolor !== "-") {
			const parts = bgcolor.split(/[,\s]+/).filter(Boolean);
			for (const p of parts) {
				if (!VALID_BGCOLORS.has(p) && !p.startsWith("#")) {
					pushErr(errors, slokano, sentno, anvaya, `Invalid bgcolor: ${p}. Must be N1-N8, NA, KP, CP or hex`);
				}
			}
		}

		const normBg = normalizeBgcolor(bgcolor);

		// Morph vs color: {अव्य} -> NA, कर्तरि -> KP
		const hasNA = bgcolor.includes("NA") || normBg === COLORS.NA || bgcolor.includes(COLORS.NA);
		if (morph.includes("{अव्य}") && !hasNA) {
			pushErr(errors, slokano, sentno, anvaya, "morph_in_context has {अव्य} but bgcolor is not NA");
		}
		const hasKP = bgcolor.includes("KP") || normBg === COLORS.KP || bgcolor.includes(COLORS.KP);
		if ((morph.includes("कर्तरि") || morph.includes("कर्तरि;")) && !hasKP) {
			pushErr(errors, slokano, sentno, anvaya, "morph_in_context has कर्तरि but bgcolor is not KP");
		}

		// Kaaraka vs possible_relations (Python logic: match relation with possible via prefix/suffix)
		// Use same separator for both: "#" or ";" (kaaraka and possible can use either)
		const possibleSep = possible.includes("#") ? "#" : ";";
		const kaarakaSep = kaaraka.includes("#") ? "#" : ";";
		const possibleEntries = parseKaarakaEntries(possible, possibleSep);
		const kaarakaList = kaaraka
			.split(kaarakaSep)
			.map((s) => s.trim())
			.filter(Boolean);
		const kaarakaFirst = kaarakaList[0] ?? "";

		const allMatch = kaarakaList.every((item) => kaarakaMatchesPossible(item, possibleEntries));
		if (!allMatch && normBg !== COLORS.KP && !(possible === "-" && kaaraka.includes("अभिहित"))) {
			if (kaaraka !== "-" && kaaraka !== "") {
				pushErr(errors, slokano, sentno, anvaya, `kaaraka_sambandha ${kaarakaFirst} not found in possible_relations ${possible}`);
			}
		}

		// At least one valid string in BOTH kaaraka AND possible (skip when both are "-" or "")
		const hasOverlap = Array.from(VALID_STRINGS).some(
			(vs) => kaaraka.includes(vs) && possible.includes(vs)
		);
		const bothEmpty = (kaaraka === "-" || kaaraka === "") && (possible === "-" || possible === "");
		if (!hasOverlap && !bothEmpty) {
			pushErr(errors, slokano, sentno, anvaya, `No valid string found in both kaaraka_sambandha and possible_relations`);
		}

		// Morph-kaaraka rules (from Python)
		if (kaaraka.includes("हेतुः") && !/[35]|तसिल्/.test(morph)) {
			pushErr(errors, slokano, sentno, anvaya, "हेतुः requires 3 or 5 or तसिल् in morph_in_context");
		}
		if ((kaaraka.includes("करणम्") || kaaraka.includes("करण,")) && !morph.includes("3")) {
			pushErr(errors, slokano, sentno, anvaya, "करणम् requires 3 in morph_in_context");
		}
		if (/विषयाधिकरणम्|देशाधिकरणम्|कालाधिकरणम्|अधिकरणम्/.test(kaaraka) && !/[7]|अव्य/.test(morph)) {
			pushErr(errors, slokano, sentno, anvaya, "अधिकरणम् variants require 7 or अव्य in morph_in_context");
		}
		if (kaaraka.includes("सम्प्रदानम्") && !morph.includes("4")) {
			pushErr(errors, slokano, sentno, anvaya, "सम्प्रदानम् requires 4 in morph_in_context");
		}
		if (kaaraka.includes("अपादानम्") && !morph.includes("5")) {
			pushErr(errors, slokano, sentno, anvaya, "अपादानम् requires 5 in morph_in_context");
		}
		if (kaaraka.includes("पूर्वकालः") && !/क्त्वा|ल्यप्/.test(morph)) {
			pushErr(errors, slokano, sentno, anvaya, "पूर्वकालः requires क्त्वा or ल्यप् in morph_in_context");
		}
		if (kaaraka.includes("षष्ठीसम्बन्धः") && !morph.includes("6")) {
			pushErr(errors, slokano, sentno, anvaya, "षष्ठीसम्बन्धः requires 6 in morph_in_context");
		}
		if (kaaraka.includes("भावलक्षणसप्तमी") && !morph.includes("7")) {
			pushErr(errors, slokano, sentno, anvaya, "भावलक्षणसप्तमी requires 7 in morph_in_context");
		}
		if (kaaraka.includes("वर्तमानसमानकालः") && !/शतृ|शानच्/.test(morph)) {
			pushErr(errors, slokano, sentno, anvaya, "वर्तमानसमानकालः requires शतृ or शानच् in morph_in_context");
		}

		// प्रयोजककर्ता
		if (kaaraka.includes("प्रयोजककर्ता")) {
			const m = kaaraka.match(/प्रयोजककर्ता,(\d+\.\d+)/);
			if (m) {
				const target = findRow(data, m[1], sentno, slokano);
				if (morph.includes("1") && target && !target.morph_in_context?.includes("णिच्")) {
					pushErr(errors, slokano, sentno, anvaya, `प्रयोजककर्ता present but target does not have णिच्`);
				}
			}
			if (!/[13]/.test(morph)) {
				pushErr(errors, slokano, sentno, anvaya, "प्रयोजककर्ता requires 1 or 3 in morph_in_context");
			}
		}

		// प्रयोज्यकर्ता
		if (kaaraka.includes("प्रयोज्यकर्ता")) {
			const m = kaaraka.match(/प्रयोज्यकर्ता,(\d+\.\d+)/);
			if (m) {
				const target = findRow(data, m[1], sentno, slokano);
				if (morph.includes("3") && target && !target.morph_in_context?.includes("णिच्")) {
					pushErr(errors, slokano, sentno, anvaya, `प्रयोज्यकर्ता present but target does not have णिच्`);
				}
			}
			if (!/[23]/.test(morph)) {
				pushErr(errors, slokano, sentno, anvaya, "प्रयोज्यकर्ता requires 2 or 3 in morph_in_context");
			}
		}

		// integers_in_morph vs bgcolor (Python: morph has vibhakti numbers, bgcolor must match)
		const integersInMorph = extractIntegersFromMorph(morph);
		if (integersInMorph.length > 0) {
			const bgcolorHasMorph = integersInMorph.some((num) => bgcolorHasNumber(bgcolor, num));
			if (!bgcolorHasMorph) {
				pushErr(errors, slokano, sentno, anvaya, `morph_in_context has vibhakti numbers ${integersInMorph.join(",")} but bgcolor does not match`);
			}
		}

		// Morph N1-N8 vs bgcolor
		const nCodes = extractN1toN8(morph);
		for (const n of nCodes) {
			if (bgcolor && !bgcolor.includes(n)) {
				pushErr(errors, slokano, sentno, anvaya, `morph_in_context has ${n} but bgcolor does not include it`);
			}
		}

		// Collect referenced anvayas
		const kaarakaEntries = parseKaarakaEntries(kaaraka, ";");
		for (const { ref } of kaarakaEntries) if (ref) referencedAnvayas.add(ref);
	}

	// Hanging references: anvaya_no referenced but does not exist
	for (const ref of Array.from(referencedAnvayas)) {
		if (!anvayaSet.has(ref)) {
			errors.push({ message: `Hanging reference: anvaya_no "${ref}" is referenced but does not exist` });
		}
	}

	return {
		errors,
		valid: errors.length === 0,
		totalRows: rows.length,
	};
}
