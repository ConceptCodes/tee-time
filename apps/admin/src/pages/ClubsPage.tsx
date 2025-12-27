import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { mockClubs, mockClubLocations } from "@/lib/mock-data"
import { Plus, Search, Settings } from "lucide-react"

export default function ClubsPage() {
  return (
    <div className="space-y-6">
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
      <div className="grid gap-4 lg:grid-cols-3">
        {mockClubs.map((club) => {
          const locationCount = mockClubLocations.filter(
            (location) => location.clubId === club.id
          ).length
          return (
          <Card key={club.name} className="border bg-card/80">
            <CardHeader>
              <CardTitle className="font-display text-xl">
                {club.name}
              </CardTitle>
              <CardDescription>
                {locationCount} locations
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Badge variant={club.isActive ? "default" : "secondary"}>
                {club.isActive ? "active" : "inactive"}
              </Badge>
              <Button variant="outline" size="icon" aria-label="Manage club">
                <Settings className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
          )
        })}
      </div>
    </div>
  )
}
