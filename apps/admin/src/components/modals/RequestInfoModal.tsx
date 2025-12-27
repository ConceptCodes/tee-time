import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import RequestInfoForm, {
  type RequestInfoFormValues,
} from "@/components/forms/RequestInfoForm"

type RequestInfoModalProps = {
  trigger: React.ReactNode
  onSubmit?: (values: RequestInfoFormValues) => void
}

export default function RequestInfoModal({
  trigger,
  onSubmit,
}: RequestInfoModalProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request missing info</DialogTitle>
          <DialogDescription>
            Ask the member for the missing details to complete automation.
          </DialogDescription>
        </DialogHeader>
        <RequestInfoForm
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
