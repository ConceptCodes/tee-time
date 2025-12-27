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

import { mockMembers, Booking } from "@/lib/mock-data"

const memberById = new Map(mockMembers.map((member) => [member.id, member]))

export const columns: ColumnDef<Booking>[] = [
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
      return end ? `${start} - ${end}` : start
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
            <DropdownMenuItem>Confirm Booking</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
