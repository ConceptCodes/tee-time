import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { Toaster } from "@/components/ui/sonner"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { AuthProvider } from "@/context/AuthContext"

import LoginPage from "@/pages/LoginPage"
import BookingsPage from "@/pages/BookingsPage"
import BookingDetailPage from "@/pages/BookingDetailPage"
import MembersPage from "@/pages/MembersPage"
import MemberProfilePage from "@/pages/MemberProfilePage"
import SettingsPage from "@/pages/SettingsPage"
import ReportsPage from "@/pages/ReportsPage"
import OverviewPage from "@/pages/OverviewPage"
import MessagesPage from "@/pages/MessagesPage"
import AuditLogsPage from "@/pages/AuditLogsPage"
import ClubsPage from "@/pages/ClubsPage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/bookings/:id" element={<BookingDetailPage />} />
                <Route path="/members" element={<MembersPage />} />
                <Route path="/members/:id" element={<MemberProfilePage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
                <Route path="/clubs" element={<ClubsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="bottom-right" />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
