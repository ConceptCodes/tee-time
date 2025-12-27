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

export default function BookingsPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
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
