export const ANALYSIS_COLUMN_WIDTH_KEY = "analysis_table_column_widths_v1";

export const DEFAULT_ANALYSIS_COLUMN_WIDTHS: Record<string, number> = {
	sanity: 32,
	index: 100,
	word: 120,
	poem: 100,
	sandhied_word: 120,
	morph_analysis: 180,
	morph_in_context: 180,
	kaaraka_relation: 220,
	kaaraka_to_index: 100,
	discourse_relation: 220,
	discourse_to_index: 100,
	possible_relations: 180,
	hindi_meaning: 180,
	english_meaning: 180,
	bgcolor: 180,
	actions: 100,
};

export const DEFAULT_MEANING_COLUMN_WIDTH = 180;

export const getDefaultAnalysisColumnWidth = (columnId: string): number => {
	if (columnId.startsWith("meaning_")) {
		return DEFAULT_MEANING_COLUMN_WIDTH;
	}
	return DEFAULT_ANALYSIS_COLUMN_WIDTHS[columnId] ?? 140;
};
