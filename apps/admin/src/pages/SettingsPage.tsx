import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StaffTab from "@/pages/settings/StaffTab"
import KnowledgeBaseTab from "@/pages/settings/KnowledgeBaseTab"
import ClubSettingsTab from "@/pages/settings/ClubSettingsTab"


export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage staff, knowledge base, and club configuration.
        </p>
      </div>
      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList>
          <TabsTrigger value="staff">Staff Management</TabsTrigger>
          <TabsTrigger value="kb">Knowledge Base</TabsTrigger>
          <TabsTrigger value="club">Club Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="staff" className="space-y-4">
            <StaffTab />
        </TabsContent>
        <TabsContent value="kb" className="space-y-4">
            <KnowledgeBaseTab />
        </TabsContent>
        <TabsContent value="club" className="space-y-4">
            <ClubSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
