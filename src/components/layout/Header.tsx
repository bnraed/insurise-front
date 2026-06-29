import { Bell, ChevronDown, LogOut, User } from 'lucide-react'
import { useState } from 'react'
import { useAppState } from '@/hooks/useAppState'
import NotificationDrawer from '@/components/ui/NotificationDrawer'
import type { PageType } from '@/types'
import type { SocketNotification } from '@/hooks/useSocket'

const pageTitles: Record<string, string> = {
  agencies: 'Gestion des Agences',
  dashboard: 'Tableau de bord',
  users: 'Gestion des utilisateurs',
  vehicles: 'Service des Mines — Gestion des Vehicules',
  guarantees: 'Garanties & Packs — Catalogue Produits',
  quotations: 'Gestion des Devis',
  'quotation-form': 'Nouveau Devis',
  contracts: 'Gestion des Contrats',
  'contract-form': 'Nouveau Contrat',
  claims: 'Gestion des Sinistres',
  reports: 'Rapports',
  settings: 'Parametres',
}

const pageBreadcrumbs: Record<string, string> = {
  agencies: 'Agences',
  dashboard: 'Tableau de bord', users: 'Utilisateurs', vehicles: 'Vehicules',
  guarantees: 'Garanties & Packs', quotations: 'Devis', 'quotation-form': 'Devis / Nouveau',
  contracts: 'Contrats', 'contract-form': 'Contrats / Nouveau',
  claims: 'Sinistres', reports: 'Rapports', settings: 'Parametres',
}

interface HeaderProps {
  notifications: SocketNotification[]
  unreadCount: number
  connected: boolean
  onMarkAllRead: () => void
  onMarkRead: (id: string) => void
  onClearAll: () => void
}

export default function Header({
  notifications, unreadCount, connected, onMarkAllRead, onMarkRead, onClearAll,
}: HeaderProps) {
  const { currentPage, setCurrentPage, setIsAuthenticated, currentUser } = useAppState()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
    localStorage.removeItem('page')
    window.dispatchEvent(new CustomEvent('insurise-logout'))
    setIsAuthenticated(false)
    setCurrentPage('login')
    setShowDropdown(false)
  }

  const initials = currentUser
    ? `${(currentUser.firstName || currentUser.username || 'A').charAt(0)}${(currentUser.lastName || '').charAt(0)}`.toUpperCase()
    : 'AG'
  const displayName = currentUser
    ? (`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username)
    : 'Agent'

  return (
    <>
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1E3A5F]">
              {pageTitles[currentPage] || 'Insurise'}
            </h1>
            <p className="text-sm text-gray-500">
              Insurise / {pageBreadcrumbs[currentPage] || currentPage}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Socket.IO connection indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`} />
              {connected ? 'En ligne' : 'Hors ligne'}
            </div>

            {/* Notification bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#E8003D] text-white text-xs min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1"
              >
                <div className="w-9 h-9 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-sm font-bold">
                  {initials}
                </div>
                <span className="text-sm font-medium text-[#1A1A2E] hidden sm:block">{displayName}</span>
                <ChevronDown size={16} className="text-gray-500" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                  <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <User size={16} /> Mon profil
                  </button>
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} /> Deconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <NotificationDrawer
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        connected={connected}
        onMarkAllRead={onMarkAllRead}
        onMarkRead={onMarkRead}
        onClear={onClearAll}
      />
    </>
  )
}
