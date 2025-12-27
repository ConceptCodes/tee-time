import { useNavigate, useParams } from "react-router-dom"
import { mockMembers, mockBookings } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { columns as bookingColumns } from "@/components/cards/BookingColumns"
import { DataTable } from "@/components/cards/DataTable"
import { ArrowLeft, Mail, Phone, Calendar } from "lucide-react"
import { format } from "date-fns"

export default function MemberProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const member = mockMembers.find(m => m.id === id)
  const memberBookings = mockBookings.filter(b => b.memberId === id)

  if (!member) {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
            <h2 className="text-xl font-semibold">Member not found</h2>
            <Button variant="outline" onClick={() => navigate("/members")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Members
            </Button>
        </div>
    )
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/members")}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
            <h1 className="text-2xl font-bold tracking-tight">{member.name}</h1>
            <p className="text-muted-foreground">Manage member profile and view history.</p>
        </div>
        <div className="ml-auto">
             <Badge
                className="text-base px-4 py-1"
                variant={
                    member.status === "active"
                    ? "default"
                    : member.status === "suspended"
                    ? "destructive"
                    : "secondary"
                }
                >
                {member.status}
            </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
             <CardHeader>
                <CardTitle>Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{member.email}</span>
                </div>
                 <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{member.phone}</span>
                </div>
                 <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Joined {format(member.joinDate, "PPP")}</span>
                </div>
                 <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Membership</p>
                    <Badge variant="outline" className="capitalize">{member.membershipType}</Badge>
                </div>
            </CardContent>
        </Card>

        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
                <CardDescription>History of tee-time reservations.</CardDescription>
            </CardHeader>
            <CardContent>
                <DataTable columns={bookingColumns} data={memberBookings} />
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
