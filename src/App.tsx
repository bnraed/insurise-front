import { useEffect, useRef } from 'react'
import { AppContext, useAppProvider } from '@/hooks/useAppState'
import Toast from '@/components/ui/Toast'
import MainLayout from '@/components/layout/MainLayout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import UsersPage from '@/pages/UsersPage'
import VehiclesPage from '@/pages/VehiclesPage'
import GuaranteesPage from '@/pages/GuaranteesPage'
import QuotationsPage from '@/pages/QuotationsPage'
import ContractsPage from '@/pages/ContractsPage'
import ClaimsPage from '@/pages/ClaimsPage'
import UserPortalPage from '@/pages/UserPortalPage'
import AgenciesPage from '@/pages/AgenciesPage'
import InsuriseChat from '@/components/InsuriseChat'

function AppContent() {
  const state = useAppProvider()

  const { isAuthenticated, refreshCurrentUser } = state
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return
    // Refresh immédiat au montage
    refreshCurrentUser()
    // Puis toutes les 30 secondes
    intervalRef.current = setInterval(() => {
      if (localStorage.getItem('token')) refreshCurrentUser()
    }, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isAuthenticated])

  const renderPage = () => {
    switch (state.currentPage) {
      case 'login':    return <LoginPage />
      case 'register': return <RegisterPage />

      // ✅ Portail client (ROLE_USER) — layout propre sans sidebar agent
      case 'user-portal': return <UserPortalPage />

      // ✅ Pages agent (ROLE_AGENT)
      case 'agencies':      return <AgenciesPage />
      case 'dashboard':     return <DashboardPage />
      case 'users':         return <UsersPage />
      case 'vehicles':      return <VehiclesPage />
      case 'guarantees':    return <GuaranteesPage />
      case 'quotations':
      case 'quotation-form': return <QuotationsPage />
      case 'contracts':
      case 'contract-form':  return <ContractsPage />
      case 'claims':        return <ClaimsPage />

      default:
        // ✅ Si le role est USER, rediriger vers le portail
        return state.role === 'USER' ? <UserPortalPage /> : <DashboardPage />
    }
  }

  // ✅ Pages sans layout (auth + portail client)
  const isFullscreenPage =
    state.currentPage === 'login' ||
    state.currentPage === 'register' ||
    state.currentPage === 'user-portal'

  return (
    <AppContext.Provider value={state}>
      {state.toast && <Toast toast={state.toast} onClose={state.hideToast} />}
      {isFullscreenPage ? (
        renderPage()
      ) : (
        <MainLayout>
          {renderPage()}
        </MainLayout>
      )}
      {/* ── Widget IA Raggenie — visible si connecté hors pages fullscreen ── */}
      {state.isAuthenticated && !isFullscreenPage && <InsuriseChat />}
    </AppContext.Provider>
  )
}

export default function App() {
  return <AppContent />
}
