import { columns } from "@/components/cards/MemberColumns"
import { DataTable } from "@/components/cards/DataTable"
import { ExportDropdown } from "@/components/ExportDropdown"
import { mockMembers, type MemberProfile } from "@/lib/mock-data"
import { exportData } from "@/lib/export"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MailPlus, UserPlus } from "lucide-react"

const memberExportColumns: { key: keyof MemberProfile; label: string }[] = [
  { key: "id", label: "Member ID" },
  { key: "name", label: "Name" },
  { key: "phoneNumber", label: "Phone" },
  { key: "membershipId", label: "Membership ID" },
  { key: "timezone", label: "Timezone" },
  { key: "favoriteLocationLabel", label: "Favorite Location" },
  { key: "preferredLocationLabel", label: "Preferred Location" },
  { key: "preferredTimeOfDay", label: "Preferred Time" },
  { key: "preferredBayLabel", label: "Preferred Bay" },
  { key: "isActive", label: "Active" },
  { key: "onboardingCompletedAt", label: "Onboarding Completed" },
  { key: "createdAt", label: "Created At" },
]

export default function MembersPage() {
  const handleExport = (format: "csv" | "json") => {
    exportData(mockMembers, "members", format, memberExportColumns)
  }

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
          <ExportDropdown
            data={mockMembers}
            filename="members"
            columns={memberExportColumns}
            onExport={handleExport}
          />
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
