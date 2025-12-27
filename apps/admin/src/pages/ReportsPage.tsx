import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DashboardTab from "@/pages/reports/DashboardTab"
import { auditColumns } from "@/components/cards/AuditColumns"
import { DataTable } from "@/components/cards/DataTable"
import { mockAuditLogs } from "@/lib/mock-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Logs</h1>
        <p className="text-muted-foreground">
          View system analytics and audit trails.
        </p>
      </div>
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="space-y-4">
            <DashboardTab />
        </TabsContent>
        <TabsContent value="logs" className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Audit Logs</CardTitle>
                    <CardDescription>Recent system activity.</CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable columns={auditColumns} data={mockAuditLogs} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
