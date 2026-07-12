import { useUIStore } from '../store/uiStore'
import { useEffect } from 'react'

export function useTheme() {
  const { theme, setTheme, toggleTheme } = useUIStore()
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  
  return { theme, toggleTheme, setTheme }
}