import { Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import ClubLocationMap from "@/components/maps/ClubLocationMap"
import { mockClubs, mockClubLocations } from "@/lib/mock-data"

export default function ClubsPage() {
  const clubsById = new Map(mockClubs.map((club) => [club.id, club]))
  const locations = mockClubLocations.map((location) => ({
    ...location,
    club: clubsById.get(location.clubId),
  }))

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
        <ClubLocationMap locations={locations} />
      </Card>
    </div>
  )
}
