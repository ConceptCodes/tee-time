import { useEffect, useMemo, useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { MessageSquareText, Users } from "lucide-react"
import { useMembers, useMessageLogs } from "@/hooks/use-api-queries"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function MessagesPage() {
  const messageLogsQuery = useMessageLogs()
  const membersQuery = useMembers()
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  const membersById = useMemo(() => {
    return new Map((membersQuery.data ?? []).map((member) => [member.id, member]))
  }, [membersQuery.data])

  const groupedLogs = useMemo(() => {
    const grouped = new Map<string, typeof messageLogsQuery.data>()
    const logs = messageLogsQuery.data ?? []
    const sorted = [...logs].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
    sorted.forEach((log) => {
      const bucket = grouped.get(log.memberId) ?? []
      bucket.push(log)
      grouped.set(log.memberId, bucket)
    })
    return grouped
  }, [messageLogsQuery.data])

  const memberSummaries = useMemo(() => {
    return [...groupedLogs.entries()]
      .map(([memberId, logs]) => ({
        memberId,
        lastLog: logs ? logs[0] : undefined,
        count: logs ? logs.length : 0,
      }))
      .sort(
        (a, b) =>
          (b.lastLog?.createdAt.getTime() ?? 0) -
          (a.lastLog?.createdAt.getTime() ?? 0)
      )
  }, [groupedLogs])

  useEffect(() => {
    if (selectedMemberId && groupedLogs.has(selectedMemberId)) return
    const nextMemberId = memberSummaries[0]?.memberId ?? null
    setSelectedMemberId(nextMemberId)
  }, [memberSummaries, groupedLogs, selectedMemberId])

  const selectedLogs = selectedMemberId
    ? groupedLogs.get(selectedMemberId) ?? []
    : []
  const selectedMember = selectedMemberId
    ? membersById.get(selectedMemberId)
    : undefined
  const inboundCount = (messageLogsQuery.data ?? []).filter(
    (log) => log.direction === "inbound"
  ).length
  const outboundCount = (messageLogsQuery.data ?? []).filter(
    (log) => log.direction === "outbound"
  ).length

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
          <Badge variant="secondary">
            {(messageLogsQuery.data ?? []).length} message logs
          </Badge>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border bg-card/80">
          <CardHeader className="space-y-3">
            <CardTitle className="font-display text-xl">
              Messaging summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border bg-background/60 p-4">
              <div className="flex items-center gap-3">
                <MessageSquareText className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Total logs</p>
                  <p className="text-xs text-muted-foreground">
                    {(messageLogsQuery.data ?? []).length} entries
                  </p>
                </div>
              </div>
              <Badge variant="secondary">Last 200</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-background/60 p-4">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Inbound vs outbound</p>
                  <p className="text-xs text-muted-foreground">
                    {inboundCount} inbound · {outboundCount} outbound
                  </p>
                </div>
              </div>
              <Badge variant="secondary">Live</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card/80 lg:col-span-2">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="font-display text-xl">
                Messages
              </CardTitle>
              <div className="relative w-full max-w-xs">
                <Input
                  className="h-9 w-full rounded-full pl-9 pr-4 bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30"
                  placeholder="Search by member ID"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-lg font-medium">Message logs</h3>
                <p className="text-sm text-muted-foreground">Review all WhatsApp and outbound notifications.</p>
              </div>
                {messageLogsQuery.isError ? (
                  <div className="text-sm text-destructive">
                    {messageLogsQuery.error instanceof Error
                      ? messageLogsQuery.error.message
                      : "Failed to load message logs"}
                  </div>
                ) : messageLogsQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">
                    Loading message logs...
                  </div>
                ) : memberSummaries.length === 0 ? (
                  <Empty className="min-h-[200px] border-none">
                    <EmptyMedia variant="icon"><MessageSquareText /></EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>No message logs</EmptyTitle>
                      <EmptyDescription>
                        WhatsApp and outbound notifications will appear here.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_2fr]">
                    <div className="min-w-0">
                      <ScrollArea className="h-[500px] pr-4">
                        <div className="space-y-2">
                          {memberSummaries.map((summary) => {
                            const member = membersById.get(summary.memberId)
                            const isActive = summary.memberId === selectedMemberId
                            return (
                              <button
                                key={summary.memberId}
                                className={`w-full rounded-xl border p-3 text-left transition ${
                                  isActive
                                    ? "border-primary/40 bg-primary/5"
                                    : "bg-background/60 hover:border-primary/20"
                                }`}
                                onClick={() => setSelectedMemberId(summary.memberId)}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">
                                      {member?.name ?? summary.memberId}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                      {summary.lastLog?.bodyRedacted}
                                    </p>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground pt-1">
                                      {summary.lastLog
                                        ? formatDistanceToNow(summary.lastLog.createdAt, {
                                            addSuffix: false,
                                          })
                                        : "-"}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <Badge 
                                      variant="outline" 
                                      className={`text-[10px] px-2 py-0 h-4 uppercase tracking-tighter ${
                                        summary.lastLog?.direction === "inbound" 
                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                      }`}
                                    >
                                      {summary.lastLog?.direction ?? "unknown"}
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px] px-2 py-0 h-4 bg-muted/30">
                                      {summary.lastLog?.channel ?? "channel"}
                                    </Badge>
                                  </div>
                                  <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                                    {summary.count} messages
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                    <div className="min-w-0 rounded-2xl border bg-background/70 p-4 flex flex-col h-[500px]">
                      {selectedMemberId ? (
                        <>
                          <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                                <Users className="h-5 w-5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold leading-none truncate">
                                  {selectedMember?.name ?? selectedMemberId}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-1 tracking-tight truncate">
                                  {selectedMember?.phoneNumber ?? "Member ID"}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="shrink-0 bg-primary/5 text-primary border-primary/20 font-medium px-3 py-1 rounded-full text-[11px]">
                              {selectedLogs.length} messages
                            </Badge>
                          </div>
                          <Separator className="my-5 opacity-50" />
                          <ScrollArea className="flex-1 min-h-0 pr-4">
                            <div className="space-y-4 px-2">
                              {selectedLogs.map((log) => (
                                <div
                                  key={log.id}
                                  className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-sm transition-all ${
                                    log.direction === "outbound"
                                      ? "ml-auto bg-primary/10 border border-primary/10 text-foreground"
                                      : "bg-muted/40 border border-border/50"
                                  }`}
                                >
                                  <p className="leading-relaxed break-words">{log.bodyRedacted}</p>
                                  <div className={`mt-2 flex items-center gap-2 text-[10px] uppercase tracking-wider font-medium font-mono ${
                                    log.direction === "outbound" ? "text-primary/70" : "text-muted-foreground"
                                  }`}>
                                    <span>{format(log.createdAt, "MMM d, h:mm a")}</span>
                                    <span>·</span>
                                    <span>{log.channel}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </>
                      ) : (
                        <Empty className="min-h-[200px] border-none">
                          <EmptyMedia variant="icon"><Users /></EmptyMedia>
                          <EmptyHeader>
                            <EmptyTitle>Select a member</EmptyTitle>
                            <EmptyDescription>
                              Choose a thread to view recent messages.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
