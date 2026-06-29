import { useRef, useEffect } from 'react'
import type { SocketNotification } from '@/hooks/useSocket'

interface Props {
  open: boolean
  onClose: () => void
  notifications: SocketNotification[]
  unreadCount: number
  connected: boolean
  onMarkAllRead: () => void
  onMarkRead: (id: string) => void
  onClear: () => void
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return `il y a ${diff}s`
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`
  return `il y a ${Math.floor(diff / 3600)}h`
}

const typeIcon: Record<string, string> = {
  contract: '📄',
  claim: '⚠️',
  info: 'ℹ️',
}

const typeBg: Record<string, string> = {
  contract: 'bg-blue-50 border-blue-200',
  claim: 'bg-orange-50 border-orange-200',
  info: 'bg-gray-50 border-gray-200',
}

export default function NotificationDrawer({
  open, onClose, notifications, unreadCount, connected,
  onMarkAllRead, onMarkRead, onClear,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div
        ref={ref}
        className="relative z-10 w-96 h-full bg-white shadow-2xl flex flex-col"
        style={{ maxWidth: '100vw' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-[#1E3A5F]">Notifications temps réel</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Connection status */}
        <div className={`px-5 py-2 text-xs font-medium flex items-center gap-2 ${
          connected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`} />
          {connected ? 'Connecté — mises à jour en temps réel' : 'Déconnecté du serveur Socket.IO'}
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex gap-3 px-5 py-2 border-b border-gray-100">
            <button
              onClick={onMarkAllRead}
              className="text-xs text-blue-600 hover:underline"
            >
              Tout marquer lu
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={onClear}
              className="text-xs text-gray-400 hover:text-red-500 hover:underline"
            >
              Effacer tout
            </button>
          </div>
        )}

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <span className="text-4xl mb-3">🔔</span>
              <p className="text-sm text-gray-400">Aucune notification pour l'instant.</p>
              <p className="text-xs text-gray-300 mt-1">
                Les événements (contrats, sinistres) apparaîtront ici en temps réel.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.read && onMarkRead(n.id)}
                  className={`px-5 py-4 cursor-pointer transition-colors ${
                    n.read ? 'bg-white' : 'bg-blue-50/40'
                  } hover:bg-gray-50`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{typeIcon[n.type] ?? '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{n.title}</span>
                        {!n.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 break-words">{n.message}</p>
                      <span className="text-xs text-gray-300 mt-1 block">{timeAgo(n.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
