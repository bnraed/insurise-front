import { useState, useMemo, useEffect } from 'react'
import { Search, Filter, Eye, Ban, RotateCcw, Clock } from 'lucide-react'
import { useAppState } from '@/hooks/useAppState'
import { contractsApi } from '@/services/api'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { formatDate, getStatusLabel } from '@/utils/helpers'

// ── UI helpers pour la modal de détail ────────────────────────────
function Section({ title, color = 'orange', children }: { title: string; color?: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    orange: 'border-orange-100 bg-orange-50/30 text-orange-500',
    blue:   'border-blue-100 bg-blue-50/30 text-blue-500',
  }
  return (
    <div className={`border rounded-xl p-4 ${styles[color]}`}>
      <h4 className="text-xs font-bold uppercase tracking-widest mb-3">{title}</h4>
      {children}
    </div>
  )
}
function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-2">{children}</div>
}
function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="py-1.5 border-b border-gray-100 last:border-0">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-medium mt-0.5 ${highlight ? 'text-[#E8003D]' : 'text-[#1A1A2E]'}`}>{value}</p>
    </div>
  )
}

interface HistoryEntry {
  id: number
  oldStatus: string | null
  newStatus: string
  changedBy: string
  reason: string | null
  changedAt: string
}

export default function ContractsPage() {
  const {
    contracts, users, vehicles, packs,
    getUserById, getVehicleById,
    refreshContracts, showToast,
  } = useAppState()

  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [packFilter, setPackFilter]     = useState('')
  const [viewItem, setViewItem]         = useState<number | null>(null)
  const [historyItem, setHistoryItem]   = useState<number | null>(null)
  const [history, setHistory]           = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [activeTab, setActiveTab]       = useState<'details' | 'history'>('details')
  const [saving, setSaving]             = useState(false)
  const [page, setPage]                 = useState(1)
  const perPage = 10

  const filtered = useMemo(() => contracts.filter(c => {
    const s = search.toLowerCase()
    const user    = getUserById(c.userId)
    const vehicle = getVehicleById(c.vehicleId)
    return (
      (!s ||
        c.contractNumber.toLowerCase().includes(s) ||
        (user    && `${user.firstName} ${user.lastName}`.toLowerCase().includes(s)) ||
        (vehicle && vehicle.registrationNumber.toLowerCase().includes(s))) &&
      (!statusFilter || c.status === statusFilter) &&
      (!packFilter   || c.packCode === packFilter)
    )
  }), [contracts, search, statusFilter, packFilter, getUserById, getVehicleById])

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated  = filtered.slice((page - 1) * perPage, page * perPage)

  const stats = {
    total:     contracts.length,
    active:    contracts.filter(c => c.status === 'ACTIVE').length,
    suspended: contracts.filter(c => c.status === 'SUSPENDED').length,
    cancelled: contracts.filter(c => c.status === 'CANCELLED').length,
  }

  const loadHistory = async (id: number) => {
    setHistoryLoading(true)
    try {
      const res = await contractsApi.getHistory(id)
      setHistory(res.data)
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const openDetail = (id: number, tab: 'details' | 'history' = 'details') => {
    setViewItem(id)
    setActiveTab(tab)
    if (tab === 'history') loadHistory(id)
  }

  const toggleStatus = async (id: number, newStatus: string) => {
    setSaving(true)
    try {
      await contractsApi.updateStatus(id, newStatus)
      await refreshContracts()
      showToast(`Contrat mis a jour : ${getStatusLabel(newStatus)}`)
      if (viewItem === id) loadHistory(id)
    } catch (e: any) {
      const raw = e.response?.data?.message || e.response?.data?.error || ''
      const msg = (raw.includes('uq_contracts_vehicle_active') || raw.includes('duplicate key value'))
        ? 'Ce véhicule a déjà un contrat actif'
        : raw || 'Erreur'
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const viewed = viewItem !== null ? contracts.find(c => c.id === viewItem) : null

  const statusColor: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    SUSPENDED: 'bg-yellow-100 text-yellow-700',
    CANCELLED: 'bg-red-100 text-red-700',
    DRAFT: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="pb-24">
      {/* Stats */}
      <div className="flex flex-wrap gap-3 mb-4">
        {[
          { label: 'Total',     value: stats.total,     color: 'bg-gray-100 text-gray-700'      },
          { label: 'Actifs',    value: stats.active,    color: 'bg-green-100 text-green-700'    },
          { label: 'Suspendus', value: stats.suspended, color: 'bg-yellow-100 text-yellow-700'  },
          { label: 'Resilies',  value: stats.cancelled, color: 'bg-red-100 text-red-700'        },
        ].map(s => (
          <span key={s.label} className={`${s.color} text-xs px-3 py-1.5 rounded-full font-medium`}>
            {s.label}: {s.value}
          </span>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher par N contrat, client, vehicule..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Tous statuts</option>
          {['ACTIVE', 'SUSPENDED', 'CANCELLED'].map(s => (
            <option key={s} value={s}>{getStatusLabel(s)}</option>
          ))}
        </select>
        <select value={packFilter} onChange={e => { setPackFilter(e.target.value); setPage(1) }}
          className="w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Tous packs</option>
          {packs.map(p => <option key={p.packCode} value={p.packCode}>{p.packLabel}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                {['N Contrat','Client','Véhicule','Pack','Prime','Agence','Paiement','Statut','Debut','Fin','Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(c => {
                const user    = getUserById(c.userId)
                const vehicle = getVehicleById(c.vehicleId)
                return (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                    <td className="px-3 py-3 font-medium text-[#1A1A2E] whitespace-nowrap">{c.contractNumber}</td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                      {user ? `${user.firstName} ${user.lastName}` : `ID:${c.userId}`}
                    </td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                      {vehicle ? `${vehicle.make} — ${vehicle.registrationNumber}` : `ID:${c.vehicleId}`}
                    </td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{c.packLabel || c.packCode || '--'}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{c.agencyCode || '--'}</td>
                    <td className="px-3 py-3 text-gray-700 font-medium">{c.totalPremium} DT</td>
                    <td className="px-3 py-3">
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{c.paymentFrequency}</span>
                    </td>
                    <td className="px-3 py-3"><Badge label={getStatusLabel(c.status)} status={c.status} /></td>
                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{formatDate(c.effectiveDate)}</td>
                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{formatDate(c.endDate)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openDetail(c.id, 'details')}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Voir details">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => openDetail(c.id, 'history')}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Historique">
                          <Clock size={16} />
                        </button>
                        {c.status === 'ACTIVE' && (
                          <button onClick={() => toggleStatus(c.id, 'SUSPENDED')} disabled={saving}
                            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded disabled:opacity-50" title="Suspendre">
                            <Ban size={16} />
                          </button>
                        )}
                        {c.status === 'SUSPENDED' && (
                          <button onClick={() => toggleStatus(c.id, 'ACTIVE')} disabled={saving}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50" title="Reactiver">
                            <RotateCcw size={16} />
                          </button>
                        )}
                        {(c.status === 'ACTIVE' || c.status === 'SUSPENDED') && (
                          <button onClick={() => toggleStatus(c.id, 'CANCELLED')} disabled={saving}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-50 text-xs" title="Resilier">
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {paginated.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">Aucun contrat trouve</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} sur {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50">Precedent</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50">Suivant</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail + History Modal */}
      <Modal
        isOpen={viewed !== null && viewed !== undefined}
        onClose={() => { setViewItem(null); setHistory([]) }}
        title={`Contrat — ${viewed?.contractNumber}`}
        size="lg"
      >
        {viewed && (() => {
          const u = getUserById(viewed.userId)
          const v = getVehicleById(viewed.vehicleId)
          return (
            <div>
              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-4">
                {(['details', 'history'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab)
                      if (tab === 'history' && history.length === 0) loadHistory(viewed.id)
                    }}
                    className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-[#E8003D] text-[#E8003D]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'details' ? 'Détails' : 'Historique des statuts'}
                  </button>
                ))}
              </div>

              {activeTab === 'details' ? (
                <div className="space-y-5">

                  {/* ── Infos contrat ───────────────────────────── */}
                  <Section title="Informations de Base du Contrat" color="orange">
                    <Row2>
                      <Field label="N° Contrat"     value={viewed.contractNumber}/>
                      <Field label="N° Devis"        value={(viewed as any).quotationId || '--'}/>
                      <Field label="Client"          value={u ? `${u.firstName} ${u.lastName}` : `ID: ${viewed.userId}`}/>
                      <Field label="Véhicule"        value={v ? `${v.make} — ${v.registrationNumber}` : `ID: ${viewed.vehicleId}`}/>
                      <Field label="Pack"            value={(viewed as any).packLabel || (viewed as any).packCode || '--'}/>
                      <Field label="Agence"          value={(viewed as any).agencyCode || '--'}/>
                      <Field label="Fractionnement"  value={(viewed as any).contractSplitType || '--'}/>
                      <Field label="Renouvellement"  value={(viewed as any).contractNature || '--'}/>
                      <Field label="Date d'Effet"    value={formatDate(viewed.effectiveDate)}/>
                      <Field label="Échéance"        value={(viewed as any).contractualDueDate ? formatDate((viewed as any).contractualDueDate) : '--'}/>
                      <Field label="Prime Totale"    value={`${viewed.totalPremium} DT`} highlight/>
                      <Field label="Statut"          value={getStatusLabel(viewed.status)}/>
                    </Row2>
                  </Section>

                  {/* ── Infos personnelles ──────────────────────── */}
                  <Section title="Informations Personnelles" color="orange">
                    <Row2>
                      <Field label="Nationalité"          value={(viewed as any).nationality || '--'}/>
                      <Field label="Nom"                  value={u?.lastName || '--'}/>
                      <Field label="Prénom"               value={u?.firstName || '--'}/>
                      <Field label="Lieu de Naissance"    value={(viewed as any).placeOfBirth || '--'}/>
                      <Field label="Civilité"             value={(viewed as any).civility || '--'}/>
                      <Field label="CIN Délivré Le"       value={(viewed as any).cinIssuedOn || '--'}/>
                      <Field label="Activité"             value={(viewed as any).activity || '--'}/>
                      <Field label="Statut Professionnel" value={(viewed as any).professionalStatus || '--'}/>
                      <Field label="Autre Nationalité"    value={(viewed as any).otherNationality || '--'}/>
                      <Field label="Source des Fonds"     value={(viewed as any).sourceOfFunds || '--'}/>
                      <Field label="Fonction Publique"    value={(viewed as any).hasPublicFunction != null ? ((viewed as any).hasPublicFunction ? 'Oui' : 'Non') : '--'}/>
                      <Field label="Famille Fct. Pub."    value={(viewed as any).hasFamilyPublicFunction != null ? ((viewed as any).hasFamilyPublicFunction ? 'Oui' : 'Non') : '--'}/>
                    </Row2>
                  </Section>

                  {/* ── Permis de conduire ──────────────────────── */}
                  <Section title="Permis de Conduire" color="orange">
                    <Row2>
                      <Field label="Numéro de Permis"   value={(viewed as any).drivingLicenseNumber || '--'}/>
                      <Field label="Délivré Le"          value={(viewed as any).drivingLicenseIssuedOn || '--'}/>
                      <Field label="Pays"                value={(viewed as any).drivingLicenseCountry || '--'}/>
                      <Field label="Lieu de Délivrance"  value={(viewed as any).drivingLicenseIssuanceLocation || '--'}/>
                    </Row2>
                  </Section>

                  {/* ── Situation familiale ─────────────────────── */}
                  <Section title="Situation Familiale" color="orange">
                    <Row2>
                      <Field label="État Civil"                     value={(viewed as any).familyStatus || '--'}/>
                      <Field label="Personnes Sous le Même Toit"    value={(viewed as any).numberOfPeopleUnderSameRoof || '--'}/>
                    </Row2>
                  </Section>

                  {/* ── Usage du véhicule ───────────────────────── */}
                  <Section title="Usage du Véhicule" color="orange">
                    <Row2>
                      <Field label="Usage du Véhicule"            value={(viewed as any).vehicleUsage || '--'}/>
                      <Field label="Transport Matières Dang."      value={(viewed as any).transportOfHazardousMaterials || '--'}/>
                      <Field label="Financé par Crédit"           value={(viewed as any).vehicleFinancedByCredit != null ? ((viewed as any).vehicleFinancedByCredit ? 'Oui' : 'Non') : '--'}/>
                      {(viewed as any).nameOfOrganization && (
                        <Field label="Nom Organisation" value={(viewed as any).nameOfOrganization}/>
                      )}
                    </Row2>
                  </Section>

                  {/* ── Montants ────────────────────────────────── */}
                  <Section title="Détails de Paiement" color="blue">
                    <Row2>
                      <Field label="Montant Total"  value={(viewed as any).totalAmount != null ? `${(viewed as any).totalAmount} DT` : '--'} highlight/>
                      <Field label="Frais"           value={(viewed as any).feeAmount   != null ? `${(viewed as any).feeAmount} DT`   : '--'}/>
                      <Field label="Montant Net"     value={(viewed as any).netAmount   != null ? `${(viewed as any).netAmount} DT`   : '--'}/>
                      <Field label="Mode Paiement"   value={(viewed as any).paymentMethod || '--'}/>
                    </Row2>
                  </Section>

                </div>
              ) : (
                <div>
                  {historyLoading ? (
                    <div className="py-8 text-center text-sm text-gray-400">Chargement de l'historique...</div>
                  ) : history.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-400">Aucun historique disponible</div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100" />
                      <div className="space-y-4">
                        {history.map((h, i) => (
                          <div key={h.id} className="flex gap-4 relative">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold
                              ${statusColor[h.newStatus] || 'bg-gray-100 text-gray-600'}`}>
                              {h.newStatus.charAt(0)}
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-lg px-4 py-3">
                              <div className="flex items-center justify-between flex-wrap gap-1">
                                <div className="flex items-center gap-2 text-sm">
                                  {h.oldStatus && (
                                    <>
                                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor[h.oldStatus] || 'bg-gray-100 text-gray-600'}`}>
                                        {getStatusLabel(h.oldStatus)}
                                      </span>
                                      <span className="text-gray-400">→</span>
                                    </>
                                  )}
                                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor[h.newStatus] || 'bg-gray-100 text-gray-600'}`}>
                                    {getStatusLabel(h.newStatus)}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-400">
                                  {new Date(h.changedAt).toLocaleString('fr-FR')}
                                </span>
                              </div>
                              <div className="mt-1 flex gap-3 text-xs text-gray-500">
                                <span>Par : <strong>{h.changedBy}</strong></span>
                                {h.reason && <span>— {h.reason}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
