import {
  LayoutDashboard, Users, Car, Shield, FileText, FileCheck,
  AlertTriangle, LogOut, Menu, X, Building2,
} from 'lucide-react'
import { useState } from 'react'
import { useAppState } from '@/hooks/useAppState'
import type { PageType } from '@/types'

interface NavItem { icon: React.ReactNode; label: string; page: PageType }

const mainNav: NavItem[] = [
  { icon: <LayoutDashboard size={20} />, label: 'Tableau de bord',  page: 'dashboard'  },
  { icon: <Building2 size={20} />,        label: 'Agences',           page: 'agencies'   },
  { icon: <Users size={20} />,           label: 'Utilisateurs',      page: 'users'      },
  { icon: <Car size={20} />,             label: 'Vehicules',         page: 'vehicles'   },
  { icon: <Shield size={20} />,          label: 'Garanties & Packs', page: 'guarantees' },
  { icon: <FileText size={20} />,        label: 'Devis',             page: 'quotations' },
  { icon: <FileCheck size={20} />,       label: 'Contrats',          page: 'contracts'  },
  { icon: <AlertTriangle size={20} />,   label: 'Sinistres',         page: 'claims'     },
]

export default function Sidebar() {
  const { currentPage, setCurrentPage, setIsAuthenticated, currentUser } = useAppState()
  const [collapsed, setCollapsed] = useState(false)

  // ✅ Vider tout le localStorage au logout
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
    localStorage.removeItem('page')
    window.dispatchEvent(new CustomEvent('insurise-logout'))
    setIsAuthenticated(false)
    setCurrentPage('login')
  }

  const isActive = (page: PageType) => {
    if (page === 'quotations') return currentPage === 'quotations' || currentPage === 'quotation-form'
    if (page === 'contracts')  return currentPage === 'contracts'  || currentPage === 'contract-form'
    return currentPage === page
  }

  // ✅ Vraies initiales depuis le user connecté
  const initials = currentUser
    ? `${(currentUser.firstName || currentUser.username || 'A').charAt(0)}${(currentUser.lastName || '').charAt(0)}`.toUpperCase()
    : 'AG'
  const displayName = currentUser
    ? (`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username)
    : 'Agent'
  const displayEmail = currentUser?.email || ''

  return (
    <>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#1E3A5F] text-white rounded-lg"
      >
        {collapsed ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`fixed left-0 top-0 h-full bg-[#1E3A5F] flex flex-col z-40 transition-all duration-300 ${collapsed ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="px-5 py-6 border-b border-blue-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#E8003D] rounded-lg flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-white text-xl font-bold tracking-tight">
                INSUR<span className="text-[#E8003D]">ISE</span>
              </h1>
              <p className="text-blue-300 text-xs">Assurance Auto</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {mainNav.map(item => (
            <button
              key={item.page}
              onClick={() => { setCurrentPage(item.page); setCollapsed(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium cursor-pointer transition-all rounded-lg ${
                isActive(item.page) ? 'bg-[#E8003D] text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`}
            >
              {item.icon}<span>{item.label}</span>
            </button>
          ))}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium cursor-pointer transition-all rounded-lg text-blue-200 hover:bg-red-600 hover:text-white mt-2"
          >
            <LogOut size={20} /><span>Deconnexion</span>
          </button>
        </nav>

        {/* ✅ Vrai user connecté */}
        <div className="px-4 py-4 border-t border-blue-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#E8003D] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{displayName}</p>
              <p className="text-blue-300 text-xs truncate">{displayEmail}</p>
            </div>
          </div>
        </div>
      </aside>

      {collapsed && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setCollapsed(false)} />
      )}
    </>
  )
}
