import { ColumnDef } from "@tanstack/react-table"
import { AuditLog, StaffUser } from "@/lib/api-types"
import { format } from "date-fns"

export const getAuditColumns = (
  actorById: Map<string, StaffUser> = new Map()
): ColumnDef<AuditLog>[] => [
  {
    accessorKey: "createdAt",
    header: "Time",
    cell: ({ row }) => format(row.getValue("createdAt"), "PP pp"),
  },
  {
    id: "actor",
    header: "User",
    cell: ({ row }) => {
      const actorId = row.original.actorId
      return actorId ? actorById.get(actorId)?.name ?? actorId : "System"
    },
  },
  {
    accessorKey: "action",
    header: "Action",
  },
  {
    accessorKey: "resourceType",
    header: "Resource",
  },
  {
    accessorKey: "resourceId",
    header: "Resource ID",
  },
  {
    accessorKey: "metadata",
    header: "Details",
    cell: ({ row }) => {
      const metadata = row.getValue("metadata") as Record<string, unknown>
      if (!metadata || Object.keys(metadata).length === 0) {
        return "-"
      }
      return JSON.stringify(metadata)
    },
  },
]
