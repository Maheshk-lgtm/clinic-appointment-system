import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { markNotificationRead, subscribeToNotifications } from '@/services/notificationService'
import type { AppNotification } from '@/types'

export function NotificationBell() {
  const { firebaseUser, profile } = useAuth()
  const [items, setItems] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!firebaseUser) return
    return subscribeToNotifications(firebaseUser.uid, setItems, profile?.role)
  }, [firebaseUser, profile?.role])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = items.filter((i) => !i.read).length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative h-9 w-9 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50"
        aria-label="Notifications"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-clay text-white text-[10px] leading-4 text-center">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-card z-30">
          {items.length === 0 && <p className="text-sm text-slate-500 p-4">No notifications yet.</p>}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => markNotificationRead(n.id)}
              className={`block w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 ${n.read ? 'opacity-60' : ''
                }`}
            >
              <p className="text-sm font-medium text-ink">{n.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
