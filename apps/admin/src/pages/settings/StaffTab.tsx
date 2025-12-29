import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Plus, ShieldCheck } from "lucide-react"
import { useStaff } from "@/hooks/use-api-queries"

export default function StaffTab() {
  const staffQuery = useStaff()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle className="font-display text-2xl">Staff Management</CardTitle>
            <CardDescription>Manage user access and roles.</CardDescription>
        </div>
        <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
        </Button>
      </CardHeader>
      <CardContent>
        {staffQuery.isError ? (
          <div className="text-sm text-destructive">
            {staffQuery.error instanceof Error
              ? staffQuery.error.message
              : "Failed to load staff"}
          </div>
        ) : staffQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading staff...</div>
        ) : (staffQuery.data ?? []).length === 0 ? (
          <Empty className="min-h-[200px] border-none">
            <EmptyMedia variant="icon"><ShieldCheck /></EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No staff added</EmptyTitle>
              <EmptyDescription>
                Add staff to grant access and manage roles.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(staffQuery.data ?? []).map((staffMember) => (
                <TableRow key={staffMember.id}>
                  <TableCell className="font-medium">{staffMember.name}</TableCell>
                  <TableCell>{staffMember.email}</TableCell>
                  <TableCell className="capitalize">{staffMember.role}</TableCell>
                  <TableCell>
                      <Badge variant={staffMember.isActive ? "default" : "secondary"}>
                      {staffMember.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
