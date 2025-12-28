import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileJson2, FileSpreadsheet } from "lucide-react";

type ExportDropdownProps<T extends Record<string, unknown>> = {
  data: T[];
  filename: string;
  columns?: { key: keyof T; label: string }[];
  onExport: (format: "csv" | "json") => void;
  disabled?: boolean;
};

export function ExportDropdown<T extends Record<string, unknown>>({
  onExport,
  disabled = false,
}: ExportDropdownProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={disabled}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExport("csv")} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("json")} className="gap-2 cursor-pointer">
          <FileJson2 className="h-4 w-4" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
