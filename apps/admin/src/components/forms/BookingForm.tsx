import { useForm } from "@tanstack/react-form"
import { zodValidator } from "@tanstack/zod-form-adapter"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { mockMembers, mockClubs } from "@/lib/mock-data"

const MAX_PLAYERS = import.meta.env.VITE_MAX_PLAYERS || 4;

const bookingSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  clubId: z.string().min(1, "Club is required"),
  preferredDate: z.string().min(1, "Date is required"),
  preferredTimeStart: z.string().min(1, "Time is required"),
  numberOfPlayers: z.number().min(1).max(MAX_PLAYERS),
  notes: z.string().optional(),
})

export type BookingFormValues = z.infer<typeof bookingSchema>

type BookingFormProps = {
  onSuccess?: (values: BookingFormValues) => void
  onCancel?: () => void
}

export default function BookingForm({ onSuccess, onCancel }: BookingFormProps) {
  const form = useForm({
    defaultValues: {
      memberId: "",
      clubId: "",
      preferredDate: "",
      preferredTimeStart: "",
      numberOfPlayers: 4,
      notes: "",
    },
    validatorAdapter: zodValidator,
    validators: {
      onSubmit: bookingSchema,
    },
    onSubmit: async ({ value }) => {
      onSuccess?.(value)
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        form.handleSubmit()
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <form.Field name="memberId">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Member</Label>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {mockMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>

        <form.Field name="clubId">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Club</Label>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue placeholder="Select club" />
                </SelectTrigger>
                <SelectContent>
                  {mockClubs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <form.Field name="preferredDate">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Date</Label>
              <Input
                id={field.name}
                type="date"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="preferredTimeStart">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Time</Label>
              <Input
                id={field.name}
                type="time"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="numberOfPlayers">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Players</Label>
              <Input
                id={field.name}
                type="number"
                min={1}
                max={4}
                value={field.state.value}
                onChange={(e) => field.handleChange(parseInt(e.target.value))}
              />
            </div>
          )}
        </form.Field>
      </div>

      <form.Field name="notes">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Notes</Label>
            <Textarea
              id={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Any special requests..."
            />
          </div>
        )}
      </form.Field>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              Create Booking
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
