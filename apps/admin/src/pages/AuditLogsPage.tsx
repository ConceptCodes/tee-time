import { auditColumns } from "@/components/cards/AuditColumns"
import { DataTable } from "@/components/cards/DataTable"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import { mockAuditLogs } from "@/lib/mock-data"

export default function AuditLogsPage() {
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
          <Button variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" />
            Download CSV
          </Button>
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
