import { Plus } from "lucide-react"

import { columns } from "@/components/cards/BookingColumns"
import { DataTable } from "@/components/cards/DataTable"
import { ExportDropdown } from "@/components/ExportDropdown"
import { mockBookings, type Booking } from "@/lib/mock-data"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import CreateBookingModal from "@/components/modals/CreateBookingModal"
import { exportData } from "@/lib/export"

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
  const handleExport = (format: "csv" | "json") => {
    exportData(mockBookings, "bookings", format, bookingExportColumns)
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
            data={mockBookings}
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
          <DataTable columns={columns} data={mockBookings} />
        </CardContent>
      </Card>
    </div>
  )
}
