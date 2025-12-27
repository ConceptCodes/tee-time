import {
  Calendar,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  MessageSquare,
  FileText
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

// Menu items.
const items = [
  { icon: LayoutDashboard, title: "Overview", url: "/" },
  { icon: Calendar, title: "Bookings", url: "/bookings" },
  { icon: Users, title: "Members", url: "/members" },
  { icon: MessageSquare, title: "Messages", url: "/messages" },
  { icon: FileText, title: "Reports", url: "/reports" },
  { icon: Settings, title: "Settings", url: "/settings" },
]

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar>
      <SidebarHeader className="border-b h-14 flex items-center justify-center px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span>Syndicate Admin</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <Button variant="ghost" className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
