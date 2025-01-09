import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Save, Trash } from "lucide-react";
import { colors } from "@/lib/constants";

interface AnalysisTableProps {
  selectedColumns: string[];
  chapter: any[];
  updatedData: any[];
  handleValueChange: (index: number, field: string, value: string) => void;
  handleDelete: (index: number) => void;
  handleSave: (index: number) => void;
  changedRows: Set<number>;
  hoveredRowIndex: number | null;
  setHoveredRowIndex: (index: number | null) => void;
  selectedMeaning: { [key: number]: string };
  opacity: number;
  permissions: string | null;
  formatMeaning: (meaning: string) => JSX.Element[];
}

export function AnalysisTable({
  selectedColumns,
  chapter,
  updatedData,
  handleValueChange,
  handleDelete,
  handleSave,
  changedRows,
  hoveredRowIndex,
  setHoveredRowIndex,
  selectedMeaning,
  opacity,
  permissions,
  formatMeaning,
}: AnalysisTableProps) {
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "0, 0, 0";
  };

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {/* Add your table headers here based on selectedColumns */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {chapter?.map((processed, procIndex) => {
            const currentProcessedData = updatedData[procIndex];
            const isHovered = hoveredRowIndex === procIndex;
            const isDeleted = currentProcessedData?.deleted;

            return (
              <TableRow
                key={procIndex}
                onMouseEnter={() => setHoveredRowIndex(procIndex)}
                onMouseLeave={() => setHoveredRowIndex(null)}
                style={{
                  backgroundColor: processed.bgcolor ? 
                    `rgba(${hexToRgb(processed.bgcolor)}, ${opacity})` : 
                    "transparent",
                }}
              >
                {/* Add your table cells here based on permissions and selectedColumns */}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}