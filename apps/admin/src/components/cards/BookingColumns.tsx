import { Link } from "react-router-dom"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"

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

import { Booking } from "@/lib/mock-data"

export const columns: ColumnDef<Booking>[] = [
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge
          variant={
            status === "confirmed"
              ? "default"
              : status === "rejected"
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
    accessorKey: "member.name",
    header: "Member",
  },
  {
    accessorKey: "club",
    header: "Club",
  },
  {
    accessorKey: "date",
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
    cell: ({ row }) => format(row.getValue("date"), "PPP"),
  },
  {
    accessorKey: "time",
    header: "Time",
  },
  {
    accessorKey: "players",
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
              onClick={() => navigator.clipboard.writeText(booking.id)}
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
