import { useNavigate, useParams } from "react-router-dom"
import { mockBookings } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ArrowLeft, Check, X, MessageSquare, Clock } from "lucide-react"

export default function BookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  // In real app, useQuery hook here
  const booking = mockBookings.find(b => b.id === id)

  if (!booking) {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
            <h2 className="text-xl font-semibold">Booking not found</h2>
            <Button variant="outline" onClick={() => navigate("/bookings")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Bookings
            </Button>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/bookings")}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Booking {booking.id}</h1>
            <p className="text-muted-foreground">View and manage reservation details.</p>
        </div>
        <div className="ml-auto flex gap-2">
            <Badge variant={
                booking.status === "confirmed" ? "default" :
                booking.status === "rejected" ? "destructive" : "secondary"
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
                     <span className="font-medium">{format(booking.date, "PPP")} at {booking.time}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                     <span className="text-muted-foreground">Club</span>
                     <span className="font-medium">{booking.club}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                     <span className="text-muted-foreground">Location</span>
                     <span className="font-medium">{booking.location}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                     <span className="text-muted-foreground">Players</span>
                     <span className="font-medium">{booking.players} Guests</span>
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
                     <span className="font-medium">{booking.member.name}</span>
                </div>
                 <div className="flex justify-between py-2 border-b">
                     <span className="text-muted-foreground">Email</span>
                     <span className="font-medium">{booking.member.email}</span>
                </div>
                 <div className="flex justify-between py-2 border-b">
                     <span className="text-muted-foreground">Phone</span>
                     <span className="font-medium">{booking.member.phone}</span>
                </div>
            </CardContent>
             <CardFooter className="flex-col gap-2 items-start opacity-70">
                <p className="text-xs text-muted-foreground">Member since {format(new Date(), "yyyy")}</p>
            </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Perform actions on this booking request.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button className="flex-1 bg-green-600 hover:bg-green-700">
                <Check className="mr-2 h-4 w-4" />
                Confirm Booking
            </Button>
             <Button variant="destructive" className="flex-1">
                <X className="mr-2 h-4 w-4" />
                Reject Booking
            </Button>
             <Button variant="secondary" className="flex-1">
                <MessageSquare className="mr-2 h-4 w-4" />
                Request More Info
            </Button>
        </CardContent>
      </Card>
    </div>
  )
}
