import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {  PencilIcon, BookOpen } from "lucide-react";
import {  SliderIcon } from "@radix-ui/react-icons";

interface AnalysisHeaderProps {
  chaptno: string;
  shlokano: string;
  selectedColumns: string[];
  handleColumnSelect: (column: string) => void;
  handleOpacityChange: (value: number[]) => void;
  selectedDictionary: string;
  setSelectedDictionary: (value: string) => void;
  handleGenerateGraph: () => void;
  columnOptions: Array<{ id: string; label: string }>;
  changedRows: Set<number>;
  handleSaveAll: () => void;
}

export function AnalysisHeader({
  chaptno,
  shlokano,
  selectedColumns,
  handleColumnSelect,
  handleOpacityChange,
  selectedDictionary,
  setSelectedDictionary,
  handleGenerateGraph,
  columnOptions,
  changedRows,
  handleSaveAll,
}: AnalysisHeaderProps) {
  return (
    <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center w-full">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Analysis Dashboard</h1>
        <p className="text-muted-foreground">
          Chapter {chaptno} - Shloka {shlokano}
        </p>
      </div>

      <div className="gap-4 xl:flex xl:flex-row md:grid md:grid-cols-2 sm:flex sm:flex-col md:w-[70%] sm:w-full sm:items-center">
        <ColumnSelector 
          selectedColumns={selectedColumns}
          handleColumnSelect={handleColumnSelect}
          columnOptions={columnOptions}
        />
        
        <OpacityControl handleOpacityChange={handleOpacityChange} />
        
        <DictionarySelector 
          selectedDictionary={selectedDictionary}
          setSelectedDictionary={setSelectedDictionary}
        />

        <Button onClick={handleGenerateGraph} className="w-[200px] justify-center sm:w-[75%]">
          Generate Graph
        </Button>

        {changedRows.size > 1 && (
          <Button onClick={handleSaveAll} className="w-5rem justify-center">
            Save All
          </Button>
        )}
      </div>
    </div>
  );
}

function ColumnSelector({ 
  selectedColumns, 
  handleColumnSelect, 
  columnOptions 
}: { 
  selectedColumns: string[];
  handleColumnSelect: (column: string) => void; 
  columnOptions: Array<{ id: string; label: string }>; 
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-center sm:w-[75%]">
          <SliderIcon className="mr-2 h-4 w-4" />
          Customize Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-4">
        <div className="space-y-4">
          <h4 className="font-medium leading-none">Toggle Columns</h4>
          <div className="space-y-2">
            {columnOptions.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={column.id} 
                  checked={selectedColumns.includes(column.id)} 
                  onCheckedChange={() => handleColumnSelect(column.id)} 
                />
                <Label htmlFor={column.id}>{column.label}</Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function OpacityControl({ handleOpacityChange }: { handleOpacityChange: (value: number[]) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-center sm:w-[75%]">
          <PencilIcon className="mr-2 h-4 w-4" />
          Color Opacity
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-4">
        <div className="space-y-4">
          <h4 className="font-medium leading-none">Adjust Opacity</h4>
          <Slider 
            defaultValue={[50]} 
            max={100} 
            step={1} 
            className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4" 
            onValueChange={handleOpacityChange} 
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DictionarySelector({ 
  selectedDictionary, 
  setSelectedDictionary 
}: { 
  selectedDictionary: string;
  setSelectedDictionary: (value: string) => void; 
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-center sm:w-[75%]">
          <BookOpen className="mr-2 h-4 w-4" />
          Select Dictionary
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-4">
        <div className="space-y-4">
          <h4 className="font-medium leading-none">Choose Dictionary</h4>
          <Select value={selectedDictionary} onValueChange={setSelectedDictionary}>
            <SelectTrigger>
              <SelectValue placeholder="Select Dictionary" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Apte's Skt-Hnd Dict">Apte Sanskrit-Hindi</SelectItem>
              <SelectItem value="Monier Williams' Skt-Eng Dict">Monier Williams Sanskrit-English</SelectItem>
              <SelectItem value="Heritage Skt-French Dict">Heritage Sanskrit-French</SelectItem>
              <SelectItem value="Cappeller's Skt-Ger Dict">Cappeller Sanskrit-German</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
} 