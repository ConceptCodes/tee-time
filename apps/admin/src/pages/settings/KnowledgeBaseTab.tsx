import { mockFAQs } from "@/lib/mock-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { format } from "date-fns"

export default function KnowledgeBaseTab() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>Manage FAQs used by the AI agent.</CardDescription>
        </div>
        <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add FAQ
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Question</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockFAQs.map((faq) => (
              <TableRow key={faq.id}>
                <TableCell className="font-medium">{faq.question}</TableCell>
                <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {faq.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="capitalize">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                </TableCell>
                <TableCell>
                  <Badge variant={faq.isActive ? "default" : "secondary"}>
                    {faq.isActive ? "active" : "inactive"}
                  </Badge>
                </TableCell>
                <TableCell>{format(faq.updatedAt, "MMM d, yyyy")}</TableCell>
                <TableCell className="text-right">
                     <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                     </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
