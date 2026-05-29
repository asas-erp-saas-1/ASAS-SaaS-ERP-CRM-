'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="relative p-2.5 text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand hover:bg-asas-sand/50 dark:hover:bg-white/5 rounded-sm transition-all cursor-pointer">
        <div className="w-5 h-5" />
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative p-2.5 text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand hover:bg-asas-sand/50 dark:hover:bg-white/5 rounded-sm transition-all cursor-pointer"
      title="Basculer le thème clair/sombre"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5" strokeWidth={2} />
      ) : (
        <Moon className="w-5 h-5" strokeWidth={2} />
      )}
    </button>
  )
}
