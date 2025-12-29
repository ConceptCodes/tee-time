import { Calendar, Plus } from "lucide-react"
import { useMemo } from "react"

import { getBookingColumns } from "@/components/cards/BookingColumns"
import { DataTable } from "@/components/cards/DataTable"
import { ExportDropdown } from "@/components/ExportDropdown"
import {
  Booking,
} from "@/lib/api-types"
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
  EmptyTitle,
  EmptyMedia,
} from "@/components/ui/empty"
import CreateBookingModal from "@/components/modals/CreateBookingModal"
import { exportData } from "@/lib/export"
import { useBookings, useClubLocations, useClubs, useMembers } from "@/hooks/use-api-queries"

const bookingExportColumns: { key: keyof Booking; label: string }[] = [
  { key: "id", label: "Booking ID" },
  { key: "clubName", label: "Club" },
  { key: "clubLocationName", label: "Location" },
  { key: "preferredDate", label: "Date" },
  { key: "preferredTimeStart", label: "Start Time" },
  { key: "preferredTimeEnd", label: "End Time" },
  { key: "numberOfPlayers", label: "Players" },
  { key: "guestNames", label: "Guests" },
  { key: "notes", label: "Notes" },
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Created At" },
]

export default function BookingsPage() {
  const bookingsQuery = useBookings()
  const membersQuery = useMembers()
  const clubsQuery = useClubs()

  const clubIds = useMemo(
    () => (clubsQuery.data ?? []).map((club) => club.id),
    [clubsQuery.data]
  )
  const locationsQuery = useClubLocations(clubIds)

  const memberById = useMemo(
    () => new Map((membersQuery.data ?? []).map((member) => [member.id, member])),
    [membersQuery.data]
  )
  const clubsById = useMemo(
    () => new Map((clubsQuery.data ?? []).map((club) => [club.id, club])),
    [clubsQuery.data]
  )
  const locationsById = useMemo(
    () =>
      new Map(
        (locationsQuery.data ?? []).map((location) => [location.id, location])
      ),
    [locationsQuery.data]
  )

  const bookings = useMemo(
    () =>
      (bookingsQuery.data ?? []).map((booking) => ({
        ...booking,
        clubName: clubsById.get(booking.clubId)?.name ?? booking.clubId,
        clubLocationName: booking.clubLocationId
          ? locationsById.get(booking.clubLocationId)?.name ?? booking.clubLocationId
          : undefined,
      })),
    [bookingsQuery.data, clubsById, locationsById]
  )

  const columns = useMemo(() => getBookingColumns(memberById), [memberById])
  const loading =
    bookingsQuery.isLoading ||
    membersQuery.isLoading ||
    clubsQuery.isLoading ||
    locationsQuery.isLoading
  const error =
    bookingsQuery.error ||
    membersQuery.error ||
    clubsQuery.error ||
    locationsQuery.error

  const handleExport = (format: "csv" | "json") => {
    exportData(bookings, "bookings", format, bookingExportColumns)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Operations
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Bookings
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportDropdown
            data={bookings}
            filename="bookings"
            columns={bookingExportColumns}
            onExport={handleExport}
          />
          <CreateBookingModal
            trigger={
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New booking
              </Button>
            }
          />
        </div>
      </div>
      <Card className="border bg-card/80">
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            All tee times
          </CardTitle>
          <CardDescription>
            Manage and view all tee-time reservations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-sm text-destructive">
              {error instanceof Error ? error.message : "Failed to load bookings"}
            </div>
          ) : loading ? (
            <div className="text-sm text-muted-foreground">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <Empty className="min-h-[240px] border-none">
              <EmptyMedia variant="icon"><Calendar /></EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No bookings yet</EmptyTitle>
                <EmptyDescription>
                  New tee-time requests will show up here as they come in.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <DataTable columns={columns} data={bookings} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
