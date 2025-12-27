import { ColumnDef } from "@tanstack/react-table"
import { AuditLog } from "@/lib/mock-data"
import { format } from "date-fns"

export const auditColumns: ColumnDef<AuditLog>[] = [
  {
    accessorKey: "timestamp",
    header: "Time",
    cell: ({ row }) => format(row.getValue("timestamp"), "PP pp"),
  },
  {
    accessorKey: "user",
    header: "User",
  },
  {
    accessorKey: "action",
    header: "Action",
  },
  {
    accessorKey: "target",
    header: "Target",
  },
  {
    accessorKey: "details",
    header: "Details",
  },
]
