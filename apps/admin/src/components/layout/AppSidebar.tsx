import {
  Calendar,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  MessageSquare,
  FileText,
  ShieldCheck,
  MapPinned,
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
  SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Menu items.
const items = [
  { icon: LayoutDashboard, title: "Overview", url: "/" },
  { icon: Calendar, title: "Bookings", url: "/bookings" },
  { icon: Users, title: "Members", url: "/members" },
  { icon: MessageSquare, title: "Messages", url: "/messages" },
  { icon: MapPinned, title: "Clubs", url: "/clubs" },
  { icon: FileText, title: "Reports", url: "/reports" },
  { icon: ShieldCheck, title: "Audit Logs", url: "/audit-logs" },
  { icon: Settings, title: "Settings", url: "/settings" },
]

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="border-b/60 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-sky-500 to-indigo-600 text-white shadow-sm">
            T
          </span>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-display text-sm font-semibold tracking-tight">
              Tee Time
            </span>
            <span className="text-xs text-sidebar-foreground/70">
              Tee Booker Ops
            </span>
          </div>
          <Badge className="ml-auto hidden bg-sidebar-accent text-sidebar-accent-foreground md:inline-flex group-data-[collapsible=icon]:hidden">
            Beta
          </Badge>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-1">
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-[0.2em] text-[10px] text-sidebar-foreground/60">
            Core Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                    className="gap-3 rounded-xl px-3 py-2 text-[13px] font-medium"
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t/60 p-4">
        <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground">
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
