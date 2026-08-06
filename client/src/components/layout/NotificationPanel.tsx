import { useEffect, useState } from 'react'
import { X, Bell } from 'lucide-react'
import { api } from '../../api/client'
import { format } from 'date-fns'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

interface NotificationPanelProps {
  open: boolean
  onClose: () => void
  unreadCount: number
  setUnreadCount: (count: number) => void
}

export function NotificationPanel({ open, onClose, unreadCount, setUnreadCount }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000) // Poll every 60s
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    if (open && notifications.length === 0) setLoading(true)
    try {
      const res = await api.notifications.list()
      if (res.success) {
        setNotifications(res.data.slice(0, 10))
        setUnreadCount(res.data.filter((n: Notification) => !n.is_read).length)
      }
    } catch {
      // Silently fail as requested (e.g. if 404)
      setUnreadCount(0)
    } finally {
      if (open) setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const res = await api.notifications.markRead(id)
      if (res.success) {
        setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(Math.max(0, unreadCount - 1))
      }
    } catch {
      // Silently fail
    }
  }

  const markAllRead = async () => {
    try {
      const res = await api.notifications.markAllRead()
      if (res.success) {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
      }
    } catch {
      // Silently fail
    }
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 z-50 h-full w-96 bg-card border-l border-border shadow-xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">Notifications</h2>
            {unreadCount > 0 && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{unreadCount}</span>}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline mr-2 font-medium">Mark all read</button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:hover:bg-accent hover:text-accent-foreground"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="overflow-y-auto h-[calc(100%-4rem)] p-4 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl hover:bg-accent hover:text-accent-foreground animate-pulse" />)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mb-4 opacity-50" />
              <p className="font-medium text-foreground">You're all caught up!</p>
              <p className="text-sm mt-1">No pending alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`p-3 rounded-xl border text-sm cursor-pointer transition-colors ${!n.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' : 'bg-background border-border opacity-75'}`}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-medium ${!n.is_read ? 'text-blue-900 dark:text-blue-400' : 'text-foreground'}`}>{n.title}</h4>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1 flex-shrink-0" />}
                  </div>
                  <p className="text-muted-foreground mb-2 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
