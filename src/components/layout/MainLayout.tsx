import { useEffect, useRef } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useSocket } from '@/hooks/useSocket'
import { useAppState } from '@/hooks/useAppState'
import { isDuplicateRecentlyShown } from '@/utils/duplicateContractGuard'

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { showToast } = useAppState()
  const { connected, notifications, unreadCount, markAllRead, markRead, clearAll, duplicatePayload } = useSocket()

  const lastProcessedTimestamp = useRef<number>(0)
  useEffect(() => {
    if (!duplicatePayload) return
    if (duplicatePayload.timestamp === lastProcessedTimestamp.current) return
    lastProcessedTimestamp.current = duplicatePayload.timestamp
    if (!isDuplicateRecentlyShown()) {
      showToast(duplicatePayload.message, 'error')
    }
  }, [duplicatePayload, showToast])

  return (
    <div className="flex h-screen bg-[#F4F6FA]">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-64 overflow-hidden">
        <Header
          connected={connected}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={markAllRead}
          onMarkRead={markRead}
          onClearAll={clearAll}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
