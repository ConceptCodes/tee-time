import { createContext, useContext, ReactNode } from "react"
import { useSession } from "@/lib/auth-client"

type User = {
  id: string
  email: string
  name: string
  image?: string | null
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

type Session = {
  id: string
  userId: string
  expiresAt: Date
  token: string
  createdAt: Date
  updatedAt: Date
  ipAddress?: string | null
  userAgent?: string | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: sessionData, isPending: isLoading } = useSession()

  const value = {
    user: sessionData?.user ?? null,
    session: sessionData?.session ?? null,
    isLoading,
    isAuthenticated: !!sessionData,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
