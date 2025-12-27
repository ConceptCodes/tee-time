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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MailPlus, UserPlus } from "lucide-react"

export default function MembersPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Community
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Members
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2">
            <MailPlus className="h-4 w-4" />
            Invite
          </Button>
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add member
          </Button>
        </div>
      </div>
      <Card className="border bg-card/80">
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Member directory
          </CardTitle>
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
