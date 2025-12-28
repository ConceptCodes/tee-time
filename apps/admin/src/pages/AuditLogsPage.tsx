import { auditColumns } from "@/components/cards/AuditColumns"
import { DataTable } from "@/components/cards/DataTable"
import { ExportDropdown } from "@/components/ExportDropdown"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockAuditLogs, type AuditLog } from "@/lib/mock-data"
import { exportData } from "@/lib/export"

const auditExportColumns: { key: keyof AuditLog; label: string }[] = [
  { key: "id", label: "Log ID" },
  { key: "user", label: "User" },
  { key: "action", label: "Action" },
  { key: "target", label: "Target" },
  { key: "details", label: "Details" },
  { key: "timestamp", label: "Timestamp" },
]

export default function AuditLogsPage() {
  const handleExport = (format: "csv" | "json") => {
    exportData(mockAuditLogs, "audit-logs", format, auditExportColumns)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Compliance
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground">
            Review system actions and staff activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Synced just now</Badge>
          <ExportDropdown
            data={mockAuditLogs}
            filename="audit-logs"
            columns={auditExportColumns}
            onExport={handleExport}
          />
        </div>
      </div>
      <Card className="border bg-card/80">
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Recent Activity
          </CardTitle>
          <CardDescription>Latest system actions and changes.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={auditColumns} data={mockAuditLogs} />
        </CardContent>
      </Card>
    </div>
  )
}
