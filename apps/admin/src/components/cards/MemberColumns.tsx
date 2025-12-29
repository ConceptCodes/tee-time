import { ColumnDef } from "@tanstack/react-table"
import { MemberProfile } from "@/lib/api-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, ArrowUpDown, Copy } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { Link } from "react-router-dom"
import { toast } from "sonner"

export const columns: ColumnDef<MemberProfile>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
    },
  },
  {
    accessorKey: "phoneNumber",
    header: "Phone",
  },
  {
    accessorKey: "timezone",
    header: "Timezone",
  },
  {
    accessorKey: "membershipId",
    header: "Membership",
    cell: ({ row }) => {
      const id = row.getValue("membershipId") as string
      return (
        <div className="flex items-center gap-2">
          <span>{id}</span>
          <Button
            variant="ghost" 
            size="icon"
            className="h-4 w-4 text-muted-foreground hover:text-primary"
            onClick={() => {
              navigator.clipboard.writeText(id)
              toast.success("Membership ID copied")
            }}
          >
            <Copy className="h-3 w-3" />
            <span className="sr-only">Copy Membership ID</span>
          </Button>
        </div>
      )
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("isActive") as boolean
      return (
        <Badge
          variant={status ? "default" : "secondary"}
        >
          {status ? "active" : "inactive"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => format(row.getValue("createdAt"), "MMM d, yyyy"),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const member = row.original
 
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
            <DropdownMenuItem asChild>
                <Link to={`/members/${member.id}`}>View Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              navigator.clipboard.writeText(member.phoneNumber)
              toast.success("Phone number copied", {
                description: `Copied ${member.phoneNumber} to clipboard`,
              })
            }}>
              Copy Phone
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
