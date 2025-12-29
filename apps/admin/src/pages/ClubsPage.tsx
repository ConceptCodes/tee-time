import { Flag, Plus, Search } from "lucide-react"
import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import ClubLocationMap from "@/components/maps/ClubLocationMap"
import { useClubLocations, useClubs } from "@/hooks/use-api-queries"

export default function ClubsPage() {
  const clubsQuery = useClubs()

  const clubsById = useMemo(
    () => new Map((clubsQuery.data ?? []).map((club) => [club.id, club])),
    [clubsQuery.data]
  )

  const clubIds = useMemo(
    () => (clubsQuery.data ?? []).map((club) => club.id),
    [clubsQuery.data]
  )
  const locationsQuery = useClubLocations(clubIds)

  const locationsWithClub = useMemo(
    () =>
      (locationsQuery.data ?? []).map((location) => ({
        ...location,
        club: clubsById.get(location.clubId),
      })),
    [locationsQuery.data, clubsById]
  )

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Operations
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Clubs
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage clubs, locations, and availability rules.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 w-52 rounded-full pl-8 lg:w-64"
              placeholder="Search clubs"
            />
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add club
          </Button>
        </div>
      </div>
      <Card className="min-h-0 flex-1 overflow-hidden border bg-card/80 p-0">
        <div className="relative h-full w-full">
          <ClubLocationMap locations={locationsWithClub} />
          {clubsQuery.isLoading || locationsQuery.isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="text-sm text-muted-foreground">
                Loading club locations...
              </div>
            </div>
          ) : clubsQuery.isError || locationsQuery.isError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="text-sm text-destructive">
                {(clubsQuery.error || locationsQuery.error) instanceof Error
                  ? ((clubsQuery.error || locationsQuery.error) as Error).message
                  : "Failed to load clubs"}
              </div>
            </div>
          ) : locationsWithClub.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Empty className="max-w-md border">
                <EmptyMedia variant="icon"><Flag /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No clubs visible</EmptyTitle>
                  <EmptyDescription>
                    Add a club to start managing locations and availability.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
