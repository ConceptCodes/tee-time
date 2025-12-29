import { columns } from "@/components/cards/MemberColumns"
import { DataTable } from "@/components/cards/DataTable"
import { ExportDropdown } from "@/components/ExportDropdown"
import { exportData } from "@/lib/export"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { MailPlus, Users } from "lucide-react"
import { MemberProfile } from "@/lib/api-types"
import { useMembers } from "@/hooks/use-api-queries"
import InviteMemberModal from "@/components/modals/InviteMemberModal"

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
  const membersQuery = useMembers()

  const handleExport = (format: "csv" | "json") => {
    exportData(membersQuery.data ?? [], "members", format, memberExportColumns)
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
            data={membersQuery.data ?? []}
            filename="members"
            columns={memberExportColumns}
            onExport={handleExport}
          />
          <InviteMemberModal
            trigger={
              <Button variant="outline" className="gap-2">
                <MailPlus className="h-4 w-4" />
                Invite
              </Button>
            }
          />
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
          {membersQuery.isError ? (
            <div className="text-sm text-destructive">
              {membersQuery.error instanceof Error
                ? membersQuery.error.message
                : "Failed to load members"}
            </div>
          ) : membersQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading members...</div>
          ) : (membersQuery.data ?? []).length === 0 ? (
            <Empty className="min-h-[240px] border-none">
              <EmptyMedia variant="icon"><Users /></EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No members yet</EmptyTitle>
                <EmptyDescription>
                  Invite members to start tracking tee-time activity.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <DataTable columns={columns} data={membersQuery.data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
