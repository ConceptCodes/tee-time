import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import HandoffModal from "@/components/modals/HandoffModal"
import RequestInfoModal from "@/components/modals/RequestInfoModal"
import SendTemplateModal from "@/components/modals/SendTemplateModal"
import {
  Bot,
  CalendarClock,
  MessageSquareText,
  Sparkles,
  Users,
} from "lucide-react"

const conversations = [
  {
    name: "Ava Richardson",
    preview: "Looking for a Sunday morning slot.",
    status: "Needs info",
    time: "2m",
  },
  {
    name: "Liam Chen",
    preview: "Confirming 2:10 PM at North Bay.",
    status: "Automated",
    time: "10m",
  },
  {
    name: "Morgan Lee",
    preview: "Need to reschedule to next week.",
    status: "Handoff",
    time: "45m",
  },
  {
    name: "Priya Nair",
    preview: "Any openings for 4 players today?",
    status: "In review",
    time: "1h",
  },
]

const templates = [
  {
    title: "Waitlist follow-up",
    description: "Offer the next available tee time.",
    status: "Active",
  },
  {
    title: "Booking confirmed",
    description: "Confirm details + arrival notes.",
    status: "Active",
  },
  {
    title: "Member onboarding",
    description: "Collect preferences and home club.",
    status: "Draft",
  },
]

const broadcasts = [
  {
    title: "Reminder: weekend tee times",
    description: "Sent to members with upcoming bookings.",
    status: "Scheduled",
    time: "Today · 4:30 PM",
  },
  {
    title: "Membership renewal",
    description: "Targeted to expiring memberships.",
    status: "Draft",
    time: "Next week",
  },
]

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Messaging
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Messages
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage member conversations and outbound updates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">132 active threads</Badge>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border bg-card/80">
          <CardHeader className="space-y-3">
            <CardTitle className="font-display text-xl">
              Inbox momentum
            </CardTitle>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge className="gap-1 bg-primary/15 text-primary">
                <Sparkles className="h-3 w-3" />
                92% auto-resolved
              </Badge>
              <Badge variant="secondary">3 escalations today</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border bg-background/60 p-4">
              <div className="flex items-center gap-3">
                <MessageSquareText className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Response time</p>
                  <p className="text-xs text-muted-foreground">4.1 min avg</p>
                </div>
              </div>
              <Badge variant="secondary">-12%</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-background/60 p-4">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Active members</p>
                  <p className="text-xs text-muted-foreground">
                    48 awaiting response
                  </p>
                </div>
              </div>
              <Badge variant="secondary">+6%</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-background/60 p-4">
              <div className="flex items-center gap-3">
                <Bot className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">AI deflection</p>
                  <p className="text-xs text-muted-foreground">
                    84% automation rate
                  </p>
                </div>
              </div>
              <Badge variant="secondary">Stable</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-background/60 p-4">
              <div className="flex items-center gap-3">
                <CalendarClock className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Follow-ups queued</p>
                  <p className="text-xs text-muted-foreground">
                    12 confirmations pending
                  </p>
                </div>
              </div>
              <Badge variant="secondary">+4</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card/80 lg:col-span-2">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="font-display text-xl">
                Conversations
              </CardTitle>
              <Input
                className="h-9 w-full max-w-xs rounded-full"
                placeholder="Search by member or booking"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="inbox" className="space-y-4">
              <TabsList>
                <TabsTrigger value="inbox">Inbox</TabsTrigger>
                <TabsTrigger value="handoff">Needs Handoff</TabsTrigger>
                <TabsTrigger value="broadcasts">Broadcasts</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
              </TabsList>
              <TabsContent value="inbox" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
                  <div className="space-y-2">
                    {conversations.map((conversation, index) => (
                      <div
                        key={conversation.name}
                        className="rounded-xl border bg-background/60 p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold">
                              {conversation.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {conversation.preview}
                            </p>
                          </div>
                          <Badge variant="secondary">{conversation.time}</Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline">{conversation.status}</Badge>
                          {index === 0 && (
                            <Badge className="bg-primary/15 text-primary">
                              Priority
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl border bg-background/70 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          Ava Richardson
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Member since 2023 · Premium
                        </p>
                      </div>
                      <Badge className="bg-primary/15 text-primary">
                        VIP
                      </Badge>
                    </div>
                    <Separator className="my-4" />
                    <div className="space-y-4">
                      <div className="max-w-[80%] rounded-2xl bg-muted p-3 text-sm">
                        Hi! Could I get a Sunday morning slot for 3 players?
                      </div>
                      <div className="ml-auto max-w-[80%] rounded-2xl bg-primary/15 p-3 text-sm text-primary">
                        Checking availability now. Do you prefer any club?
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="rounded-xl border bg-background/70 p-4 text-sm">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Next actions
                      </p>
                      <p className="mt-2 font-medium">
                        Automation handled intake. Awaiting club selection.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <RequestInfoModal
                          trigger={
                            <Button variant="outline" size="sm">
                              Request info
                            </Button>
                          }
                        />
                        <SendTemplateModal
                          trigger={
                            <Button variant="outline" size="sm">
                              Send template
                            </Button>
                          }
                        />
                        <HandoffModal
                          trigger={<Button size="sm">Handoff to staff</Button>}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="handoff" className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {conversations.slice(1, 3).map((conversation) => (
                    <div
                      key={conversation.name}
                      className="rounded-xl border bg-background/60 p-4"
                    >
                      <p className="text-sm font-semibold">
                        {conversation.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conversation.preview}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant="outline">Needs handoff</Badge>
                        <HandoffModal
                          trigger={
                            <Button variant="outline" size="sm">
                              Assign
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="broadcasts" className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {broadcasts.map((broadcast) => (
                    <div
                      key={broadcast.title}
                      className="rounded-xl border bg-background/60 p-4"
                    >
                      <p className="text-sm font-semibold">{broadcast.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {broadcast.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant="outline">{broadcast.status}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {broadcast.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="templates" className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {templates.map((template) => (
                    <div
                      key={template.title}
                      className="rounded-xl border bg-background/60 p-4"
                    >
                      <p className="text-sm font-semibold">{template.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant="outline">{template.status}</Badge>
                        <SendTemplateModal
                          trigger={
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
