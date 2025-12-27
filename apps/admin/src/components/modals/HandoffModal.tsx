import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import HandoffForm, {
  type HandoffFormValues,
} from "@/components/forms/HandoffForm"

type HandoffModalProps = {
  trigger: React.ReactNode
  onSubmit?: (values: HandoffFormValues) => void
}

export default function HandoffModal({
  trigger,
  onSubmit,
}: HandoffModalProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Handoff to staff</DialogTitle>
          <DialogDescription>
            Add context so the team can take over quickly.
          </DialogDescription>
        </DialogHeader>
        <HandoffForm
          onCancel={() => setOpen(false)}
          onSuccess={(values) => {
            onSubmit?.(values)
            setOpen(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
