import { useState } from "react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiPost } from "@/lib/api-client"
import { ApiResponse } from "@/lib/api-types"

type InviteMemberModalProps = {
  trigger: React.ReactNode
}

export default function InviteMemberModal({ trigger }: InviteMemberModalProps) {
  const [open, setOpen] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!phoneNumber.trim()) return
    try {
      setSubmitting(true)
      await apiPost<ApiResponse<{ phoneNumber: string }>>("/api/members/invite", {
        phoneNumber: phoneNumber.trim(),
      })
      toast.success("Invite sent", {
        description: "The member will receive a WhatsApp invite shortly.",
      })
      setPhoneNumber("")
      setOpen(false)
    } catch (error) {
      toast.error("Failed to send invite", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            Send a WhatsApp invite to start onboarding.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="invite-phone">Phone number</Label>
            <Input
              id="invite-phone"
              type="tel"
              placeholder="+44..."
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!phoneNumber.trim() || submitting}>
              Send invite
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
