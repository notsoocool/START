import { toast } from "sonner"; // Ensure to import your toast function

export function checkConstraints(data: any[], validStrings: any) {
    const pattern = /(?:पुं;|स्त्री;|नपुं;)(\d+);/; // Compile regex pattern for future use

    for (const item of data) {
        const { morph_in_context, color_code, kaaraka_sambandha, possible_relations, index } = item;

        // Check for the first occurrence of कर्ता in kaaraka_sambandha
        const match = /कर्ता,(\d+\.\d+)/.exec(kaaraka_sambandha);
        
        if (!kaaraka_sambandha.includes('अभिहित_कर्ता') && match) {
            const targetIndex = match[1];
            const targetItem = data.find(d => String(d.index) === targetIndex);
            
            if (targetItem) {
                const targetMorphInContext = targetItem.morph_in_context || '';
                if (morph_in_context.includes('1') && !targetMorphInContext.includes('कर्तरि')) {
                    toast.error(`Error: Index ${index} has कर्ता, but index ${targetIndex} does not have कर्तरि.`);
                    return; // Exit after showing error
                }
                if (morph_in_context.includes('3') && !targetMorphInContext.includes('कर्मणि')) {
                    toast.error(`Error: Index ${index} has कर्ता, but index ${targetIndex} does not have कर्मणि.`);
                    return; // Exit after showing error
                }
                if (morph_in_context.includes('6') && !/(ल्युट्|घञ्)/.test(targetMorphInContext)) {
                    toast.error(`Error: Index ${index} has कर्ता, but index ${targetIndex} does not have ल्युट् or घञ्.`);
                    return; // Exit after showing error
                }
            }
        }

        // Additional constraint checks
        if (kaaraka_sambandha in ["-", ""]) {
            toast.error(`Error in Index: ${index} - Hanging node detected`);
            return; // Exit after showing error
        }

        if (morph_in_context.includes('/')) {
            toast.error(`Error in Index: ${index} - morph_in_context contains a "/"`);
            return; // Exit after showing error
        }

        if (kaaraka_sambandha.includes('#')) {
            toast.error(`Error in Index: ${index} - kaaraka_sambandha contains a "#"`);
            return; // Exit after showing error
        }

        const patterns = new RegExp(`\\b${String(index)}\\b`);
        if (patterns.test(kaaraka_sambandha)) {
            toast.error(`Error in Index: ${index} - Self Loop Detected`);
            return; // Exit after showing error
        }

        // Implement remaining checks...
        // Example check
        if ('{अव्य}' in morph_in_context && color_code !== 'NA') {
            toast.error(`Error in Index: ${index} - check Morph Analysis and Color Code`);
            return; // Exit after showing error
        }

        // Other checks would follow the same structure
    }
}
