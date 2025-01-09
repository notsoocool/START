import { useState, useEffect } from 'react';
import { toast } from 'sonner';

// Define a type for the analysis data
type AnalysisData = {
  anvaya_no: string;
  sentno: string;
  word: string;
  poem: string;
  morph_analysis: string;
  morph_in_context: string;
  kaaraka_sambandha: string;
  possible_relations: string;
  bgcolor: string;
  deleted?: boolean;
  original_anvaya_no?: string;
  slokano: string;
  // Add other fields as necessary
};

type AnalysisDataKeys = keyof AnalysisData;

export function useAnalysis(book: string, part1: string, part2: string, chaptno: string, id: string) {
  const [shloka, setShloka] = useState(null);
  const [chapter, setChapter] = useState<AnalysisData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedData, setUpdatedData] = useState<AnalysisData[]>([]);
  const [originalData, setOriginalData] = useState<AnalysisData[]>([]);
  const [changedRows, setChangedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [shlokaData, chapterData] = await Promise.all([
          fetch(`/api/ahShloka/${id}`).then(res => res.json()),
          fetch(`/api/analysis/${book}/${part1}/${part2}/${chaptno}`).then(res => res.json())
        ]);

        setShloka(shlokaData);
        setChapter(chapterData);
        setUpdatedData(chapterData.map((item: AnalysisData) => ({ ...item })));
        setOriginalData(chapterData.map((item: AnalysisData) => ({ ...item })));
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load analysis data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, book, part1, part2, chaptno]);

  const handleValueChange = (procIndex: number, field: keyof AnalysisData, value: string) => {
    setUpdatedData(prevData => {
      const newData = [...prevData];
      newData[procIndex] = {
        ...newData[procIndex],
        [field]: value,
      };
      return newData;
    });

    setChangedRows(prev => new Set(prev.add(procIndex)));
  };

  const handleSave = async (procIndex: number) => {
    const currentData = updatedData[procIndex];
    const originalRowData = originalData[procIndex];

    if (currentData.deleted) {
        setChangedRows((prev) => {
            const newRows = new Set(prev);
            newRows.delete(procIndex);
            return newRows;
        });
        return;
    }

    try {
        // Use the stored original_anvaya_no for the API call
        const response = await fetch(`/api/analysis/${book}/${part1}/${part2}/${chaptno}/${currentData.slokano}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                original_anvaya_no: currentData.original_anvaya_no || originalRowData.anvaya_no,
                new_anvaya_no: currentData.anvaya_no,
                sentno: currentData.sentno,
                word: currentData.word,
                poem: currentData.poem,
                morph_analysis: currentData.morph_analysis,
                morph_in_context: currentData.morph_in_context,
                kaaraka_sambandha: currentData.kaaraka_sambandha,
                possible_relations: currentData.possible_relations,
                bgcolor: currentData.bgcolor,
            }),
        });

        const result = await response.json();

        if (response.ok) {
            // Update the original data to match the current state
            setOriginalData((prevData) => {
                const newData = [...prevData];
                newData[procIndex] = { ...currentData };
                return newData;
            });

            // Clear the changed state for this row
            setChangedRows((prev) => {
                const newRows = new Set(prev);
                newRows.delete(procIndex);
                return newRows;
            });

            toast.success(`Row ${currentData.anvaya_no} updated successfully`);
        } else {
            console.error("Error saving row:", result);
            // Revert the UI changes on error
            setUpdatedData((prevData) => {
                const newData = [...prevData];
                newData[procIndex] = originalRowData;
                return newData;
            });
            toast.error(`Error updating row: ${result.message}`);
        }
    } catch (error) {
        console.error("Error saving row:", error);
        // Revert the UI changes on error
        setUpdatedData((prevData) => {
            const newData = [...prevData];
            newData[procIndex] = originalRowData;
            return newData;
        });
        toast.error(`Error saving row: ${(error as Error).message}`);
    }
};

  const handleDelete = async (procIndex: number) => {
    // ... existing delete logic ...
  };

  return {
    shloka,
    chapter,
    loading,
    updatedData,
    originalData,
    changedRows,
    handleValueChange,
    handleSave,
    handleDelete,
  };
}