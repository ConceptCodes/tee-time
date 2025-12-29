import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import BookingForm from "@/components/forms/BookingForm"
import { toast } from "sonner"
import { Booking } from "@/lib/api-types"
import { useCreateBooking } from "@/hooks/use-api-queries"
import type { BookingFormValues } from "@/lib/booking-form"

type CreateBookingModalProps = {
  trigger: React.ReactNode
  onCreated?: (booking: Booking) => void
}

export default function CreateBookingModal({
  trigger,
  onCreated,
}: CreateBookingModalProps) {
  const [open, setOpen] = React.useState(false)
  const createBooking = useCreateBooking({
    onSuccess: (booking) => {
      toast.success("Booking created successfully", {
        description: "The new reservation has been added to the system."
      })
      onCreated?.(booking)
      setOpen(false)
    },
    onError: (error) => {
      toast.error("Failed to create booking", {
        description: error instanceof Error ? error.message : "Please try again."
      })
    },
  })

  const handleSubmit = async (values: BookingFormValues) => {
    await createBooking.mutateAsync(values)
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
