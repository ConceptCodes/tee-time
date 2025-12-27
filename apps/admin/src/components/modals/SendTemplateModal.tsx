import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import SendTemplateForm, {
  type SendTemplateFormValues,
} from "@/components/forms/SendTemplateForm"

type SendTemplateModalProps = {
  trigger: React.ReactNode
  onSubmit?: (values: SendTemplateFormValues) => void
}

export default function SendTemplateModal({
  trigger,
  onSubmit,
}: SendTemplateModalProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send approved template</DialogTitle>
          <DialogDescription>
            Templates must match Twilio-approved message copy.
          </DialogDescription>
        </DialogHeader>
        <SendTemplateForm
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
