import { format } from "date-fns";

type ExportFormat = "csv" | "json";

/**
 * Converts an array of objects to CSV string
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns?: { key: keyof T; label: string }[]
): string {
  if (data.length === 0) return "";

  // Use provided columns or derive from first object
  const cols = columns || Object.keys(data[0]).map((key) => ({ key: key as keyof T, label: String(key) }));
  
  // Header row
  const header = cols.map((col) => `"${col.label}"`).join(",");
  
  // Data rows
  const rows = data.map((row) =>
    cols
      .map((col) => {
        const value = row[col.key];
        if (value === null || value === undefined) return '""';
        if (value instanceof Date) return `"${format(value, "yyyy-MM-dd HH:mm:ss")}"`;
        if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  return [header, ...rows].join("\n");
}

/**
 * Downloads data as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV file
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
): void {
  const csv = toCSV(data, columns);
  const timestamp = format(new Date(), "yyyy-MM-dd-HHmm");
  downloadFile(csv, `${filename}-${timestamp}.csv`, "text/csv;charset=utf-8;");
}

/**
 * Export data to JSON file
 */
export function exportToJSON<T>(data: T[], filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const timestamp = format(new Date(), "yyyy-MM-dd-HHmm");
  downloadFile(json, `${filename}-${timestamp}.json`, "application/json");
}

/**
 * Generic export function
 */
export function exportData<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  format: ExportFormat = "csv",
  columns?: { key: keyof T; label: string }[]
): void {
  if (format === "csv") {
    exportToCSV(data, filename, columns);
  } else {
    exportToJSON(data, filename);
  }
}
