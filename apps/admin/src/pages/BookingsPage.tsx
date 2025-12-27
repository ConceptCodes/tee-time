import { columns } from "@/components/cards/BookingColumns"
import { DataTable } from "@/components/cards/DataTable"
import { mockBookings } from "@/lib/mock-data"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Plus } from "lucide-react"

export default function BookingsPage() {
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
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New booking
          </Button>
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
