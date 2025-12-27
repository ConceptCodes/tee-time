import { mockStaff } from "@/lib/mock-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"

export default function StaffTab() {
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
            {mockStaff.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell className="font-medium">{staff.name}</TableCell>
                <TableCell>{staff.email}</TableCell>
                <TableCell className="capitalize">{staff.role}</TableCell>
                <TableCell>
                     <Badge variant={staff.isActive ? "default" : "secondary"}>
                      {staff.isActive ? "active" : "inactive"}
                    </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
