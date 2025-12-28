import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import BookingForm, { type BookingFormValues } from "@/components/forms/BookingForm"
import { toast } from "sonner"

type CreateBookingModalProps = {
  trigger: React.ReactNode
}

export default function CreateBookingModal({ trigger }: CreateBookingModalProps) {
  const [open, setOpen] = React.useState(false)

  const handleSubmit = (values: BookingFormValues) => {
    console.log("Creating booking:", values)
    toast.success("Booking created successfully", {
      description: "The new reservation has been added to the system."
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
          <DialogDescription>
            Manually add a new tee-time reservation for a member.
          </DialogDescription>
        </DialogHeader>
        <BookingForm 
          onSuccess={handleSubmit} 
          onCancel={() => setOpen(false)} 
        />
      </DialogContent>
    </Dialog>
  )
}
