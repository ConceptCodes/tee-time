import { Link } from "react-router-dom"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Booking, MemberProfile } from "@/lib/api-types"

const formatTimeRange = (start?: string, end?: string | null) => {
  if (!start) return "-"
  const normalizedStart = start.slice(0, 5)
  const normalizedEnd = end ? end.slice(0, 5) : ""
  return normalizedEnd ? `${normalizedStart} - ${normalizedEnd}` : normalizedStart
}

export const getBookingColumns = (
  memberById: Map<string, MemberProfile> = new Map()
): ColumnDef<Booking>[] => [
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge
          variant={
            status === "Confirmed"
              ? "default"
              : status === "Not Available"
              ? "destructive"
              : "secondary"
          }
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "memberId",
    header: "Member",
    cell: ({ row }) => {
      const memberId = row.getValue("memberId") as string
      return memberById.get(memberId)?.name ?? "Unknown"
    },
  },
  {
    accessorKey: "clubName",
    header: "Club",
    cell: ({ row }) => row.getValue("clubName") ?? row.original.clubId,
  },
  {
    accessorKey: "preferredDate",
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
    },
    cell: ({ row }) => format(new Date(row.getValue("preferredDate")), "PPP"),
  },
  {
    accessorKey: "preferredTimeStart",
    header: "Time",
    cell: ({ row }) => {
      const start = row.getValue("preferredTimeStart") as string
      const end = row.original.preferredTimeEnd
      return formatTimeRange(start, end)
    },
  },
  {
    accessorKey: "numberOfPlayers",
    header: "Players",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const booking = row.original
      const status = booking.status
      const actionConfig = (() => {
        switch (status) {
          case "Pending":
            return { label: "Confirm booking", disabled: false }
          case "Follow-up required":
            return { label: "Request follow-up", disabled: false }
          case "Confirmed":
            return { label: "Already confirmed", disabled: true }
          case "Cancelled":
            return { label: "Booking cancelled", disabled: true }
          case "Not Available":
            return { label: "Offer alternative", disabled: false }
          default:
            return { label: "View booking status", disabled: true }
        }
      })()

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(booking.id)
                toast.success("Booking ID copied", {
                  description: booking.id,
                })
              }}
            >
              Copy Booking ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link to={`/bookings/${booking.id}`}>View details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={actionConfig.disabled}>
              {actionConfig.label}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
