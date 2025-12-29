import { useForm } from "@tanstack/react-form"

import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useClubs, useMembers } from "@/hooks/use-api-queries"
import { bookingSchema, type BookingFormValues } from "@/lib/booking-form"

const parseGuestNames = (value?: string) =>
  value
    ?.split(",")
    .map((guest) => guest.trim())
    .filter(Boolean) ?? []

const joinGuestNames = (names: string[]) => (names.length ? names.join(", ") : "")

const appendGuestName = (existingValue: string | undefined, guest: string) => {
  const sanitized = guest.trim()
  if (!sanitized) {
    return existingValue ?? ""
  }

  const existing = parseGuestNames(existingValue)
  if (existing.includes(sanitized)) {
    return existingValue ?? joinGuestNames(existing)
  }

  return joinGuestNames([...existing, sanitized])
}

const removeGuestName = (existingValue: string | undefined, guest: string) => {
  const remaining = parseGuestNames(existingValue).filter((name) => name !== guest)
  return joinGuestNames(remaining)
}

type BookingFormProps = {
  onSuccess?: (values: BookingFormValues) => void
  onCancel?: () => void
}

export default function BookingForm({ onSuccess, onCancel }: BookingFormProps) {
  const membersQuery = useMembers()
  const clubsQuery = useClubs()
  const [guestInput, setGuestInput] = useState("")

  const form = useForm({
    defaultValues: {
      memberId: "",
      clubId: "",
      preferredDate: "",
      preferredTimeStart: "",
      numberOfPlayers: 4,
      guestNames: "",
      notes: "",
    },
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
                  {(membersQuery.data ?? []).map((m) => (
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
                  {(clubsQuery.data ?? []).map((c) => (
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

      <form.Field name="guestNames">
        {(field) => {
          const guests = parseGuestNames(field.state.value)

          const commitGuest = (value: string) => {
            const updated = appendGuestName(field.state.value, value)
            field.handleChange(updated)
            setGuestInput("")
          }

          const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault()
              if (guestInput.trim()) {
                commitGuest(guestInput)
              }
            }
          }

          const handleRemoveGuest = (guest: string) => {
            field.handleChange(removeGuestName(field.state.value, guest))
          }

          return (
            <div className="space-y-2">
              <Label htmlFor={`${field.name}-input`}>Guest names</Label>
              <div className="flex min-h-[48px] flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
                {guests.map((guest) => (
                  <Badge
                    key={guest}
                    variant="secondary"
                    className="flex items-center gap-2 text-xs"
                  >
                    <span>{guest}</span>
                    <button
                      type="button"
                      className="rounded-full p-1 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label={`Remove ${guest}`}
                      onClick={() => handleRemoveGuest(guest)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  id={`${field.name}-input`}
                  type="text"
                  value={guestInput}
                  onChange={(event) => setGuestInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => {
                    if (guestInput.trim()) {
                      commitGuest(guestInput)
                    }
                  }}
                  placeholder="Press Enter after each guest"
                  className="flex-1 min-w-[120px] border-0 bg-transparent px-0 py-1 text-sm focus-visible:outline-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Press Enter to add each guest to the list.
              </p>
            </div>
          )
        }}
      </form.Field>

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
