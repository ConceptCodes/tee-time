import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import {
  CalendarClock,
  ChevronRight,
  Cpu,
  ShieldCheck,
  Users,
} from "lucide-react"
import CreateBookingModal from "@/components/modals/CreateBookingModal"
import { useOverviewUi } from "@/hooks/use-api-queries"
import { format } from "date-fns"
import { Link } from "react-router-dom"

export default function OverviewPage() {
  const overviewQuery = useOverviewUi({ upcomingLimit: 3 })
  const overview = overviewQuery.data

  const formatChange = (value: number) => {
    const rounded = Number(value.toFixed(1))
    if (rounded > 0) return `+${rounded}%`
    return `${rounded}%`
  }

  const formatPercent = (value: number) => `${value.toFixed(1)}%`

  const stats = [
    {
      label: "Bookings today",
      value: overview?.stats.bookingsToday.value ?? 0,
      change: formatChange(overview?.stats.bookingsToday.changePct ?? 0),
      icon: CalendarClock,
    },
    {
      label: "Pending approvals",
      value: overview?.stats.pendingApprovals.value ?? 0,
      change: formatChange(overview?.stats.pendingApprovals.changePct ?? 0),
      icon: ShieldCheck,
    },
    {
      label: "Active members",
      value: overview?.stats.activeMembers?.value ?? 0,
      change: formatChange(overview?.stats.activeMembers?.changePct ?? 0),
      icon: Users,
    },
    {
      label: "AI Automation",
      value: formatPercent(overview?.stats.automationRate?.value ?? 0),
      change: formatChange(overview?.stats.automationRate?.changePct ?? 0),
      icon: Cpu,
    },
  ]

  const upcoming = overview?.upcoming ?? []
  const memberPulse = overview?.memberPulse

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur">
        <div className="absolute -right-20 top-0 h-48 w-64 -translate-y-1/3 rounded-full bg-gradient-to-br from-emerald-400/40 via-sky-400/30 to-indigo-500/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-56 -translate-x-1/3 translate-y-1/3 rounded-full bg-gradient-to-tr from-amber-300/30 via-rose-300/20 to-transparent blur-3xl" />
        <div className="relative space-y-4">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Keep tee times flowing with clarity and speed.
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Monitor bookings, staff coverage, and member satisfaction in one
              premium command center.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <CreateBookingModal
              trigger={
                <Button className="gap-2">
                  Create booking
                  <ChevronRight className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border bg-card/80">
            <CardHeader className="space-y-3 pb-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span>{stat.label}</span>
                <stat.icon className="h-4 w-4" />
              </div>
              <div className="flex items-end justify-between">
                <CardTitle className="font-display text-3xl">
                  {stat.value}
                </CardTitle>
                <Badge variant="secondary">{stat.change}</Badge>
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Upcoming tee times
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overviewQuery.isError ? (
              <div className="text-sm text-destructive">
                {overviewQuery.error instanceof Error
                  ? overviewQuery.error.message
                  : "Failed to load overview"}
              </div>
            ) : overviewQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading upcoming bookings...
              </div>
            ) : upcoming.length === 0 ? (
              <Empty className="min-h-[200px] border-none">
                <EmptyMedia variant="icon"><CalendarClock /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No upcoming bookings</EmptyTitle>
                  <EmptyDescription>
                    Bookings scheduled for today and beyond will show here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              upcoming.map((item, index) => {
                const label = item.locationName
                  ? `${item.clubName ?? "Club"} ${item.locationName}`
                  : item.clubName ?? "Club"
                const dateLabel = item.preferredDate
                  ? format(new Date(item.preferredDate), "MMM d")
                  : "TBD"
                const timeLabel = item.preferredTimeStart
                  ? format(
                      new Date(
                        `${item.preferredDate}T${item.preferredTimeStart}`
                      ),
                      "h:mm a"
                    )
                  : "TBD"
                const meta = `${item.memberName ?? "Member"} · ${
                  item.numberOfPlayers
                } players · ${dateLabel}`
                return (
                  <div key={item.id} className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {label} · {timeLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">{meta}</p>
                      </div>
                      <Badge
                        variant={
                          item.status === "Confirmed" ? "default" : "outline"
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                    {index < upcoming.length - 1 && <Separator />}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="border bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Member pulse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-primary/80">
                VIP Response
              </p>
              <p className="mt-2 text-2xl font-semibold text-primary">
                {memberPulse
                  ? `${Math.round(memberPulse.vipResponseRate * 100)}% delighted`
                  : "0% delighted"}
              </p>
              <p className="text-xs text-muted-foreground">
                {memberPulse
                  ? `${formatChange(memberPulse.vipResponseChangePct)} vs last period`
                  : "Loading response rate"}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-background/60 p-4">
              <div>
                <p className="text-sm font-medium">New member invites</p>
                <p className="text-xs text-muted-foreground">
                  {memberPulse?.newMemberInvites ?? 0} added recently
                </p>
              </div>
              <Badge variant="secondary">
                {memberPulse ? formatChange(memberPulse.inviteChangePct) : "0%"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Pending confirmations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overviewQuery.isError ? (
              <div className="text-sm text-destructive">
                {overviewQuery.error instanceof Error
                  ? overviewQuery.error.message
                  : "Failed to load pending confirmations"}
              </div>
            ) : overviewQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading pending confirmations...
              </div>
            ) : (overview?.pendingConfirmations ?? []).length === 0 ? (
              <Empty className="min-h-[200px] border-none">
                <EmptyMedia variant="icon"><ShieldCheck /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No pending confirmations</EmptyTitle>
                  <EmptyDescription>
                    Pending tee-time confirmations will show here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              (overview?.pendingConfirmations ?? []).map((item, index) => {
                const label = item.locationName
                  ? `${item.clubName ?? "Club"} ${item.locationName}`
                  : item.clubName ?? "Club"
                const dateLabel = item.preferredDate
                  ? format(new Date(item.preferredDate), "MMM d")
                  : "TBD"
                const timeLabel = item.preferredTimeStart
                  ? format(
                      new Date(
                        `${item.preferredDate}T${item.preferredTimeStart}`
                      ),
                      "h:mm a"
                    )
                  : "TBD"
                const meta = `${item.memberName ?? "Member"} · ${
                  item.numberOfPlayers
                } players · ${dateLabel}`
                return (
                  <div key={item.id} className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {label} · {timeLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">{meta}</p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/bookings/${item.id}`}>View</Link>
                      </Button>
                    </div>
                    {index < (overview?.pendingConfirmations ?? []).length - 1 && (
                      <Separator />
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
