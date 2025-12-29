import { useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getBookingColumns } from "@/components/cards/BookingColumns"
import { DataTable } from "@/components/cards/DataTable"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ArrowLeft, Phone, Calendar, Globe2, MapPin } from "lucide-react"
import { format } from "date-fns"
import { useBookings, useMember } from "@/hooks/use-api-queries"

export default function MemberProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const memberQuery = useMember(id)
  const bookingsQuery = useBookings()

  const member = memberQuery.data ?? null
  const bookings = useMemo(() => {
    if (!member) return []
    return (bookingsQuery.data ?? []).filter((booking) => booking.memberId === member.id)
  }, [bookingsQuery.data, member])

  const memberById = useMemo(() => {
    return member ? new Map([[member.id, member]]) : new Map()
  }, [member])
  const bookingColumns = useMemo(
    () => getBookingColumns(memberById),
    [memberById]
  )

  if (memberQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        Loading member profile...
      </div>
    )
  }

  if (memberQuery.isError || !member) {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
            <h2 className="text-xl font-semibold">
              {memberQuery.isError ? "Unable to load member" : "Member not found"}
            </h2>
            {memberQuery.isError && (
              <p className="text-sm text-muted-foreground">
                {memberQuery.error instanceof Error
                  ? memberQuery.error.message
                  : "Please try again."}
              </p>
            )}
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
                    member.isActive
                    ? "default"
                    : "secondary"
                }
                >
                {member.isActive ? "active" : "inactive"}
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
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{member.phoneNumber}</span>
                </div>
                 <div className="flex items-center gap-3">
                    <Globe2 className="h-4 w-4 text-muted-foreground" />
                    <span>{member.timezone}</span>
                </div>
                <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{member.favoriteLocationLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Joined {format(member.createdAt, "PPP")}</span>
                </div>
                {member.onboardingCompletedAt && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Onboarded {format(member.onboardingCompletedAt, "PPP")}</span>
                  </div>
                )}
                 <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Membership</p>
                    <Badge variant="outline">{member.membershipId}</Badge>
                    {member.preferredLocationLabel && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Preferred location: {member.preferredLocationLabel}
                      </p>
                    )}
                    {member.preferredTimeOfDay && (
                      <p className="text-xs text-muted-foreground">
                        Preferred time: {member.preferredTimeOfDay}
                      </p>
                    )}
                    {member.preferredBayLabel && (
                      <p className="text-xs text-muted-foreground">
                        Preferred bay: {member.preferredBayLabel}
                      </p>
                    )}
                </div>
            </CardContent>
        </Card>

        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
                <CardDescription>History of tee-time reservations.</CardDescription>
            </CardHeader>
            <CardContent>
                {bookings.length === 0 ? (
                  <Empty className="min-h-[200px] border-none">
                    <EmptyMedia variant="icon"><Calendar /></EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>No bookings yet</EmptyTitle>
                      <EmptyDescription>
                        This member has not requested a tee time yet.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <DataTable columns={bookingColumns} data={bookings} />
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
