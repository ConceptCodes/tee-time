import { useForm } from "@tanstack/react-form"
import { zodValidator } from "@tanstack/zod-form-adapter"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const handoffSchema = z.object({
  reason: z.string().optional(),
})

export type HandoffFormValues = z.infer<typeof handoffSchema>

type HandoffFormProps = {
  onSuccess?: (values: HandoffFormValues) => void
  onCancel?: () => void
}

export default function HandoffForm({ onSuccess, onCancel }: HandoffFormProps) {
  const form = useForm({
    defaultValues: {
      reason: "",
    },
    validatorAdapter: zodValidator,
    validators: {
      onSubmit: handoffSchema,
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
      <form.Field name="reason">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Handoff note (optional)</Label>
            <Textarea
              id={field.name}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              rows={4}
              placeholder="Summarize the request and what needs attention."
            />
            {field.state.meta.errors?.[0] && (
              <p className="text-xs text-destructive">
                {field.state.meta.errors[0]}
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
              Create handoff
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
