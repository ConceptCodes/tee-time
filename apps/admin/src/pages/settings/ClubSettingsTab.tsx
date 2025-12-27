import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function ClubSettingsTab() {
  return (
    <div className="grid gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Club Information</CardTitle>
                <CardDescription>General settings for the golf club.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="clubName">Club Name</Label>
                    <Input id="clubName" defaultValue="Syndicate Golf Club" />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea id="address" defaultValue="123 Golf Course Rd, Augusta, GA" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" defaultValue="+1 (555) 000-0000" />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="email">Context Email</Label>
                        <Input id="email" defaultValue="contact@syndicate.com" />
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button>Save Changes</Button>
            </CardFooter>
        </Card>
    </div>
  )
}
