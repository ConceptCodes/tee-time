import { useMemo } from "react"
import { ScrollText } from "lucide-react"
import { getAuditColumns } from "@/components/cards/AuditColumns"
import { DataTable } from "@/components/cards/DataTable"
import { ExportDropdown } from "@/components/ExportDropdown"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { exportData } from "@/lib/export"
import {
  AuditLog,
} from "@/lib/api-types"
import { useAuditLogs, useStaff } from "@/hooks/use-api-queries"

const auditExportColumns: { key: keyof AuditLog; label: string }[] = [
  { key: "id", label: "Log ID" },
  { key: "action", label: "Action" },
  { key: "actorId", label: "Actor ID" },
  { key: "resourceType", label: "Resource" },
  { key: "resourceId", label: "Resource ID" },
  { key: "metadata", label: "Metadata" },
  { key: "createdAt", label: "Timestamp" },
]

export default function AuditLogsPage() {
  const logsQuery = useAuditLogs()
  const staffQuery = useStaff()

  const staffById = useMemo(
    () => new Map((staffQuery.data ?? []).map((user) => [user.id, user])),
    [staffQuery.data]
  )
  const auditColumns = useMemo(() => getAuditColumns(staffById), [staffById])

  const handleExport = (format: "csv" | "json") => {
    exportData(logsQuery.data ?? [], "audit-logs", format, auditExportColumns)
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
            data={logsQuery.data ?? []}
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
          {logsQuery.isError ? (
            <div className="text-sm text-destructive">
              {logsQuery.error instanceof Error
                ? logsQuery.error.message
                : "Failed to load audit logs"}
            </div>
          ) : logsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading audit logs...
            </div>
          ) : (logsQuery.data ?? []).length === 0 ? (
            <Empty className="min-h-[240px] border-none">
              <EmptyMedia variant="icon"><ScrollText /></EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No audit activity yet</EmptyTitle>
                <EmptyDescription>
                  System actions and staff activity will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <DataTable columns={auditColumns} data={logsQuery.data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
