import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  CalendarClock,
  ChevronRight,
  MessageSquareText,
  ShieldCheck,
  Users,
} from "lucide-react"
import CreateBookingModal from "@/components/modals/CreateBookingModal"

const stats = [
  {
    label: "Bookings today",
    value: "128",
    change: "+12%",
    icon: CalendarClock,
  },
  {
    label: "Pending approvals",
    value: "14",
    change: "-3",
    icon: ShieldCheck,
  },
  {
    label: "Avg response time",
    value: "4.2 min",
    change: "-18%",
    icon: MessageSquareText,
  },
]

const upcoming = [
  {
    title: "Wentworth West · 3:10 PM",
    meta: "R. Kwon · 2 guests · Cart",
    status: "Confirmed",
  },
  {
    title: "Sunningdale Old · 4:00 PM",
    meta: "L. Ortega · Walking",
    status: "Pending",
  },
  {
    title: "Royal Birkdale · 4:40 PM",
    meta: "A. Patel · 3 guests",
    status: "Confirmed",
  },
]

export default function OverviewPage() {
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
            <Button variant="outline" className="gap-2">
              View pipeline
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
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
            {upcoming.map((item, index) => (
              <div key={item.title} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.meta}
                    </p>
                  </div>
                  <Badge
                    variant={item.status === "Confirmed" ? "default" : "outline"}
                  >
                    {item.status}
                  </Badge>
                </div>
                {index < upcoming.length - 1 && <Separator />}
              </div>
            ))}
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
                94% delighted
              </p>
              <p className="text-xs text-muted-foreground">
                High praise for speed and tone.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-background/60 p-4">
              <div>
                <p className="text-sm font-medium">New member invites</p>
                <p className="text-xs text-muted-foreground">
                  12 requests awaiting review
                </p>
              </div>
              <Badge variant="secondary">+4 today</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Automations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border bg-background/60 p-4">
              <Users className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Member onboarding</p>
                <p className="text-xs text-muted-foreground">
                  4 new members in progress
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border bg-background/60 p-4">
              <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Booking follow-ups</p>
                <p className="text-xs text-muted-foreground">
                  8 confirmations queued
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border bg-background/60 p-4">
              <MessageSquareText className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">FAQ coverage</p>
                <p className="text-xs text-muted-foreground">
                  92% auto-resolved this week
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
