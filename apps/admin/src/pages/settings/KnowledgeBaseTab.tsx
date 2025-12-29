import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Plus, Trash2, BookOpen, ChevronDown, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

import { useFaqs, useUpdateFaq } from "@/hooks/use-api-queries"
import { FAQ } from "@/lib/api-types"

function FaqRow({ faq }: { faq: FAQ }) {
  const [isOpen, setIsOpen] = useState(false)
  const [answer, setAnswer] = useState(faq.answer)
  const updateFaq = useUpdateFaq()

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row toggle
    updateFaq.mutate(
      { id: faq.id, data: { answer } },
      {
        onSuccess: () => {
          toast.success("FAQ updated")
          setIsOpen(false)
        },
        onError: () => {
          toast.error("Failed to update FAQ")
        }
      }
    )
  }

  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        data-state={isOpen ? "selected" : undefined}
      >
        <TableCell className="font-medium align-top py-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 text-muted-foreground">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
            <span>{faq.question}</span>
          </div>
        </TableCell>
        <TableCell className="align-top py-3">
          <div className="flex flex-wrap gap-1">
            {faq.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="capitalize text-xs font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell className="align-top py-3">
          <Badge variant={faq.isActive ? "default" : "secondary"}>
            {faq.isActive ? "active" : "inactive"}
          </Badge>
        </TableCell>
        <TableCell className="align-top py-3 text-muted-foreground">
          {format(new Date(faq.updatedAt), "MMM d, yyyy")}
        </TableCell>
        <TableCell className="text-right align-top py-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              // Delete handler would go here
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-muted/30 hover:bg-muted/30 border-t-0">
          <TableCell colSpan={5} className="p-4 pt-0">
            <div className="pl-9 space-y-3">
              <Textarea 
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter the answer for this FAQ..."
                className="min-h-[120px] resize-y bg-background"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex items-center justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setAnswer(faq.answer) // Reset
                    setIsOpen(false)
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleSave}
                  disabled={updateFaq.isPending}
                >
                  {updateFaq.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export default function KnowledgeBaseTab() {
  const faqsQuery = useFaqs()

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
        {faqsQuery.isError ? (
          <div className="text-sm text-destructive">
            {faqsQuery.error instanceof Error
              ? faqsQuery.error.message
              : "Failed to load FAQs"}
          </div>
        ) : faqsQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading FAQs...</div>
        ) : (faqsQuery.data ?? []).length === 0 ? (
          <Empty className="min-h-[200px] border-none">
            <EmptyMedia variant="icon"><BookOpen /></EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No FAQs yet</EmptyTitle>
              <EmptyDescription>
                Add FAQs so the agent can answer common questions.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Question</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(faqsQuery.data ?? []).map((faq) => (
                <FaqRow key={faq.id} faq={faq} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
