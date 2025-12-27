import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StaffTab from "@/pages/settings/StaffTab"
import KnowledgeBaseTab from "@/pages/settings/KnowledgeBaseTab"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShieldCheck } from "lucide-react"


export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Control Center
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage staff, knowledge base, and club configuration.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Policy synced</Badge>
          <Button variant="outline" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Review security
          </Button>
        </div>
      </div>
      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList>
          <TabsTrigger value="staff">Staff Management</TabsTrigger>
          <TabsTrigger value="kb">Knowledge Base</TabsTrigger>
        </TabsList>
        <TabsContent value="staff" className="space-y-4">
            <StaffTab />
        </TabsContent>
        <TabsContent value="kb" className="space-y-4">
            <KnowledgeBaseTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
