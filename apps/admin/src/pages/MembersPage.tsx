import { columns } from "@/components/cards/MemberColumns"
import { DataTable } from "@/components/cards/DataTable"
import { mockMembers } from "@/lib/mock-data"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function MembersPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Directory of all registered members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={mockMembers} />
        </CardContent>
      </Card>
    </div>
  )
}
