import { useEffect, useState } from 'react'
import { Car, FileText, FileCheck, AlertTriangle, ArrowUpRight, Loader2 } from 'lucide-react'
import { useAppState } from '@/hooks/useAppState'
import { dashboardApi } from '@/services/api'
import { formatDate, getStatusColor, getStatusLabel } from '@/utils/helpers'
import Badge from '@/components/ui/Badge'

export default function DashboardPage() {
  const { contracts, claims, getUserById, getVehicleById, setCurrentPage, loading } = useAppState()
  const [stats, setStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const today = new Date().toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true)
      try {
        const res = await dashboardApi.getStats()
        setStats(res.data)
      } catch (e) {
        console.error('Dashboard stats error:', e)
      } finally { setLoadingStats(false) }
    }
    fetchStats()
  }, [])

  const kpis = [
    {
      icon: <Car size={24} />, iconBg: 'bg-blue-100 text-[#1E3A5F]',
      value: stats ? String(stats.totalVehicles || 0) : '...',
      label: 'Vehicules enregistres',
      trend: stats ? `${stats.totalUsers || 0} utilisateurs` : '',
      trendColor: 'text-green-600',
    },
    {
      icon: <FileText size={24} />, iconBg: 'bg-orange-100 text-orange-600',
      value: stats ? String(stats.quotationsByStatus?.PENDING || 0) : '...',
      label: 'Devis en attente',
      trend: stats ? `${stats.totalQuotations || 0} total` : '',
      trendColor: 'text-blue-600',
    },
    {
      icon: <FileCheck size={24} />, iconBg: 'bg-green-100 text-green-600',
      value: stats ? String(stats.contractsByStatus?.ACTIVE || 0) : '...',
      label: 'Contrats actifs',
      trend: stats ? `${stats.contractsExpiringIn30Days || 0} a renouveler` : '',
      trendColor: 'text-yellow-600',
    },
    {
      icon: <AlertTriangle size={24} />, iconBg: 'bg-red-100 text-red-600',
      value: stats ? String((stats.claimsByStatus?.OPEN || 0) + (stats.claimsByStatus?.IN_INSTRUCTION || 0)) : '...',
      label: 'Sinistres ouverts',
      trend: stats ? `${stats.claimsByStatus?.CLOSED || 0} clotures` : '',
      trendColor: 'text-red-600',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={40} className="animate-spin text-[#E8003D]" />
          <p className="text-gray-500 text-sm">Chargement des donnees...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24">
      <div className="mb-6">
        <p className="text-gray-500 text-sm">Bienvenue -- Agence AG-ae51 | {today}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className={`${kpi.iconBg} rounded-xl p-3`}>{kpi.icon}</div>
              <ArrowUpRight size={16} className="text-gray-400" />
            </div>
            {loadingStats
              ? <div className="h-8 w-16 bg-gray-100 animate-pulse rounded mb-2" />
              : <p className="text-3xl font-bold text-[#1E3A5F]">{kpi.value}</p>
            }
            <p className="text-sm text-gray-500 mt-1">{kpi.label}</p>
            <p className={`text-xs mt-2 ${kpi.trendColor}`}>{kpi.trend}</p>
          </div>
        ))}
      </div>

      {/* Main section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent contracts */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-[#1A1A2E]">Derniers contrats</h3>
              <button onClick={() => setCurrentPage('contracts')} className="text-sm text-[#E8003D] hover:underline flex items-center gap-1">
                Voir tout <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {['N Contrat','Client','Vehicule','Prime','Statut','Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contracts.slice(0, 5).map(c => {
                    const user = getUserById(c.userId)
                    const vehicle = getVehicleById(c.vehicleId)
                    return (
                      <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-[#1A1A2E]">{c.contractNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{user ? `${user.firstName} ${user.lastName}` : '--'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{vehicle ? `${vehicle.make} ${vehicle.registrationNumber}` : '--'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{c.totalPremium} DT</td>
                        <td className="px-4 py-3"><Badge label={getStatusLabel(c.status)} status={c.status} /></td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(c.effectiveDate)}</td>
                      </tr>
                    )
                  })}
                  {contracts.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Aucun contrat</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent claims */}
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-[#1A1A2E]">Sinistres recents</h3>
            </div>
            <div className="p-4 space-y-3">
              {claims.slice(0, 5).map(cl => {
                const dotColor: Record<string, string> = {
                  OPEN: 'bg-red-500', IN_INSTRUCTION: 'bg-yellow-500',
                  IN_TREATMENT: 'bg-blue-500', CLOSED: 'bg-green-500',
                }
                return (
                  <div key={cl.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${dotColor[cl.status] || 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A2E]">{cl.claimNumber}</p>
                      <p className="text-xs text-gray-500">{cl.incidentType}</p>
                      <p className="text-xs text-gray-400">{cl.contractId}</p>
                    </div>
                    <Badge label={getStatusLabel(cl.status)} status={cl.status} />
                  </div>
                )
              })}
              {claims.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucun sinistre</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button onClick={() => setCurrentPage('claims')}
                className="w-full py-2 border border-[#E8003D] text-[#E8003D] rounded-lg text-sm font-medium hover:bg-red-50">
                Voir tous les sinistres
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats financières si disponibles */}
      {stats && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Total primes actives</p>
            <p className="text-2xl font-bold text-[#1E3A5F]">
              {Number(stats.totalPremiumActive || 0).toLocaleString('fr-FR')} DT
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Total indemnites versees</p>
            <p className="text-2xl font-bold text-red-600">
              {Number(stats.totalIndemnityPaid || 0).toLocaleString('fr-FR')} DT
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
