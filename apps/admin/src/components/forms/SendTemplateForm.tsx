import { useForm } from "@tanstack/react-form"

import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const sendTemplateSchema = z.object({
  templateId: z.string().min(1, "Select a template."),
  personalization: z.string().min(1, "Add a personalization line."),
})

export type SendTemplateFormValues = z.infer<typeof sendTemplateSchema>

type SendTemplateFormProps = {
  onSuccess?: (values: SendTemplateFormValues) => void
  onCancel?: () => void
}

export default function SendTemplateForm({
  onSuccess,
  onCancel,
}: SendTemplateFormProps) {
  const form = useForm({
    defaultValues: {
      templateId: "booking-confirmed",
      personalization: "",
    },
    validators: {
      onSubmit: sendTemplateSchema,
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
      <form.Field name="templateId">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Template</Label>
            <Select
              value={field.state.value}
              onValueChange={field.handleChange}
            >
              <SelectTrigger id={field.name}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="booking-confirmed">
                  Booking confirmed
                </SelectItem>
                <SelectItem value="waitlist-followup">
                  Waitlist follow-up
                </SelectItem>
                <SelectItem value="reminder">24-hour reminder</SelectItem>
                <SelectItem value="followup">Post-round follow-up</SelectItem>
              </SelectContent>
            </Select>
            {field.state.meta.errors?.[0] && (
              <p className="text-xs text-destructive">
                {field.state.meta.errors[0]?.message}
              </p>
            )}
          </div>
        )}
      </form.Field>
      <form.Field name="personalization">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Personalization</Label>
            <Textarea
              id={field.name}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              rows={3}
              placeholder="Add a short note for the member."
            />
            {field.state.meta.errors?.[0] && (
              <p className="text-xs text-destructive">
                {field.state.meta.errors[0]?.message}
              </p>
            )}
          </div>
        )}
      </form.Field>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              Send template
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
