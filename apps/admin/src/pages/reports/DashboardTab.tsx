import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, Clock, TrendingUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useConversionRate,
  useResponseTime,
  useMemberActivity,
} from "@/hooks/use-report-queries"

export default function DashboardTab() {
  const period = "month"
  
  const { data: conversionData, isLoading: conversionLoading } = useConversionRate(period)
  const { data: responseTimeData, isLoading: responseTimeLoading } = useResponseTime(period)
  const { data: memberActivityData, isLoading: memberActivityLoading } = useMemberActivity(period)

  const loading = conversionLoading || responseTimeLoading || memberActivityLoading

  const stats = conversionData && responseTimeData && memberActivityData ? {
    totalBookings: conversionData.total,
    confirmedBookings: conversionData.confirmed,
    conversionRate: conversionData.conversionRate,
    avgResponseTimeMinutes: responseTimeData.averageMinutes,
    activeMembers: memberActivityData.totalMembers,
    pendingBookings: conversionData.total - conversionData.confirmed - conversionData.notAvailable - conversionData.cancelled,
  } : null

  const formatPercent = (rate: number) => `${(rate * 100).toFixed(1)}%`
  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins.toFixed(0)} min`
    const hours = Math.floor(mins / 60)
    const remaining = Math.round(mins % 60)
    return `${hours}h ${remaining}m`
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Bookings
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalBookings ?? 0}</div>
          <p className="text-xs text-muted-foreground">
            Last 30 days
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Conversion Rate
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPercent(stats?.conversionRate ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats?.confirmedBookings ?? 0} confirmed of {stats?.totalBookings ?? 0}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Avg Response Time
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatMinutes(stats?.avgResponseTimeMinutes ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            Time to first staff action
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Active Members
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.activeMembers ?? 0}</div>
          <p className="text-xs text-muted-foreground">
            Members with bookings this month
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
