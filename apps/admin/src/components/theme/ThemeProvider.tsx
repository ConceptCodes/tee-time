import * as React from "react"

type Theme = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = "syndicate-admin-theme"

function getStoredTheme(defaultTheme: Theme) {
  if (typeof window === "undefined") {
    return defaultTheme
  }

  const storedTheme = localStorage.getItem(STORAGE_KEY)
  return storedTheme === "dark" ? "dark" : defaultTheme
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
}: {
  children: React.ReactNode
  defaultTheme?: Theme
}) {
  const [theme, setThemeState] = React.useState<Theme>(() =>
    getStoredTheme(defaultTheme)
  )

  React.useEffect(() => {
    const root = window.document.documentElement
    root.classList.toggle("dark", theme === "dark")
  }, [theme])

  const setTheme = React.useCallback((value: Theme) => {
    setThemeState(value)
    localStorage.setItem(STORAGE_KEY, value)
  }, [])

  const toggleTheme = React.useCallback(() => {
    setThemeState((prev) => {
      const nextTheme = prev === "dark" ? "light" : "dark"
      localStorage.setItem(STORAGE_KEY, nextTheme)
      return nextTheme
    })
  }, [])

  const value = React.useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.")
  }
  return context
}
