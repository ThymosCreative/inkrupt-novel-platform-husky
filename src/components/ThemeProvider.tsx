import { createContext, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'

type Theme = 'dark' | 'light' | 'system' | 'sepia'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  )
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()

  const isReader = /^\/novel\/[^/]+\/chapter\/\d+/.test(location.pathname)

  useEffect(() => {
    if (
      isAuthenticated &&
      user?.preferences?.theme &&
      ['dark', 'light', 'system', 'sepia'].includes(user.preferences.theme)
    ) {
      setThemeState(user.preferences.theme as Theme)
    }
  }, [user?.preferences?.theme, isAuthenticated])

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove('light', 'dark', 'sepia')

    const activeTheme = isReader ? theme : 'dark'

    if (activeTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(activeTheme)
  }, [theme, isReader])

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(storageKey, newTheme)
    if (isAuthenticated && user) {
      try {
        const prefs = user.preferences || {}
        await pb.collection('users').update(user.id, { preferences: { ...prefs, theme: newTheme } })
      } catch {
        /* intentionally ignored */
      }
    }
  }

  return (
    <ThemeProviderContext.Provider {...props} value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
