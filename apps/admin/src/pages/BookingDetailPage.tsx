import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ArrowLeft, Check, X, MessageSquare, Clock, User } from "lucide-react"
import { useBooking, useMember } from "@/hooks/use-api-queries"

export default function BookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const bookingQuery = useBooking(id)
  const memberQuery = useMember(bookingQuery.data?.memberId)

  if (bookingQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        Loading booking...
      </div>
    )
  }

  if (bookingQuery.isError || !bookingQuery.data) {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
            <h2 className="text-xl font-semibold">
              {bookingQuery.isError ? "Unable to load booking" : "Booking not found"}
            </h2>
            {bookingQuery.isError && (
              <p className="text-sm text-muted-foreground">
                {bookingQuery.error instanceof Error
                  ? bookingQuery.error.message
                  : "Please try again."}
              </p>
            )}
            <Button variant="outline" onClick={() => navigate("/bookings")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Bookings
            </Button>
        </div>
    )
  }

  const booking = bookingQuery.data
  const member = memberQuery.data ?? null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/bookings")}>
              <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
              <h1 className="text-2xl font-bold tracking-tight">Booking {booking.id}</h1>
              <p className="text-muted-foreground">View and manage reservation details.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            {booking.status !== "Confirmed" && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    <Check className="mr-2 h-4 w-4" />
                    Confirm Booking
                </Button>
            )}
            {booking.status !== "Not Available" && (
                <Button size="sm" variant="destructive">
                    <X className="mr-2 h-4 w-4" />
                    Mark Not Available
                </Button>
            )}
            <Button size="sm" variant="secondary">
                <MessageSquare className="mr-2 h-4 w-4" />
                Request Info
            </Button>
            <div className="mx-2 h-6 w-px bg-border" />
            <Badge variant={
                booking.status === "Confirmed" ? "default" :
                booking.status === "Not Available" ? "destructive" : "secondary"
            } className="text-base px-4 py-1">
                {booking.status}
            </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Reservation Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="flex justify-between py-2 border-b">
                     <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4"/> Date & Time</span>
                     <span className="font-medium">
                      {format(new Date(booking.preferredDate), "PPP")} at {booking.preferredTimeStart}
                      {booking.preferredTimeEnd ? ` - ${booking.preferredTimeEnd}` : ""}
                    </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                     <span className="text-muted-foreground">Club</span>
                     <span className="font-medium">{booking.clubName ?? booking.clubId}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                     <span className="text-muted-foreground">Location</span>
                     <span className="font-medium">{booking.clubLocationName ?? booking.clubLocationId ?? "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                     <span className="text-muted-foreground">Bay</span>
                     <span className="font-medium">{booking.bayLabel ?? booking.bayId ?? "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                     <span className="text-muted-foreground">Players</span>
                     <span className="font-medium">{booking.numberOfPlayers}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                     <span className="text-muted-foreground">Guests</span>
                     <span className="font-medium">{booking.guestNames}</span>
                </div>
                <div className="flex justify-between py-2">
                     <span className="text-muted-foreground">Notes</span>
                     <span className="font-medium">{booking.notes}</span>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Member Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
                 <div className="flex justify-between py-2 border-b">
                     <span className="text-muted-foreground">Name</span>
                     <span className="font-medium">{member?.name ?? "Unknown"}</span>
                </div>
                 <div className="flex justify-between py-2 border-b">
                     <span className="text-muted-foreground">Phone</span>
                     <span className="font-medium">{member?.phoneNumber ?? "-"}</span>
                </div>
                 <div className="flex justify-between py-2 border-b">
                     <span className="text-muted-foreground">Membership</span>
                     <span className="font-medium">{member?.membershipId ?? "-"}</span>
                </div>
                <div className="flex justify-between py-2">
                     <span className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4" /> Member ID</span>
                     <span className="font-medium">{booking.memberId}</span>
                </div>
            </CardContent>
             <CardFooter className="flex-col gap-2 items-start opacity-70">
                <p className="text-xs text-muted-foreground">
                  Member since {member ? format(member.createdAt, "yyyy") : "-"}
                </p>
            </CardFooter>
        </Card>
      </div>

    </div>
  )
}
