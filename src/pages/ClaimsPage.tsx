import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Eye, Pencil, Clock, Loader2 } from 'lucide-react'
import { useAppState } from '@/hooks/useAppState'
import { claimsApi } from '@/services/api'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import DatePicker from '@/components/ui/DatePicker'
import { formatDate, getStatusLabel, getIncidentTypeLabel, todayStr } from '@/utils/helpers'
import type { Claim } from '@/types'

interface HistoryEntry {
  id: number
  oldStatus: string | null
  newStatus: string
  changedBy: string
  comment: string | null
  changedAt: string
}

const emptyClaim = (): Partial<Claim> => ({
  contractId: '', incidentDate: todayStr(), declarationDate: todayStr(),
  incidentType: 'COLLISION', description: '', location: '',
  isThirdPartyInvolved: false, status: 'OPEN', assignedTo: null, indemnityAmount: null,
})

const statusColor: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_INSTRUCTION: 'bg-yellow-100 text-yellow-700',
  IN_TREATMENT: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-green-100 text-green-700',
  DECLARED: 'bg-gray-100 text-gray-600',
}

export default function ClaimsPage() {
  const { claims, contracts, refreshClaims, showToast } = useAppState()

  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter]     = useState('')
  const [modalMode, setModalMode]       = useState<'create' | 'edit' | 'view' | null>(null)
  const [current, setCurrent]           = useState<Partial<Claim>>(emptyClaim())
  const [errors, setErrors]             = useState<Record<string, string>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [saving, setSaving]             = useState(false)
  const [page, setPage]                 = useState(1)
  const perPage = 10

  // History
  const [activeTab, setActiveTab]       = useState<'details' | 'history'>('details')
  const [history, setHistory]           = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // 🔔 Auto-refresh quand un sinistre est créé par le chat AI
  useEffect(() => {
    const handler = () => {
      refreshClaims()
    }
    window.addEventListener('claim-created', handler)
    return () => window.removeEventListener('claim-created', handler)
  }, [refreshClaims])

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return [...claims]
      .filter(c =>
        (!s || c.claimNumber.toLowerCase().includes(s) || (c.contractId || '').toString().toLowerCase().includes(s) || c.location.toLowerCase().includes(s)) &&
        (!statusFilter || c.status === statusFilter) &&
        (!typeFilter || c.incidentType === typeFilter)
      )
      // Plus récent en premier — les sinistres du portail client apparaissent en tête
      .sort((a, b) => {
        const da = (a as any).createdAt || a.declarationDate || ''
        const db = (b as any).createdAt || b.declarationDate || ''
        return db.localeCompare(da)
      })
  }, [claims, search, statusFilter, typeFilter])

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated  = filtered.slice((page - 1) * perPage, page * perPage)
  const incidentTypes = ['COLLISION','VOL','INCENDIE','BRIS_GLACE','CATASTROPHE_NATURELLE','AUTRE']
  const claimStatuses: Claim['status'][] = ['OPEN','IN_INSTRUCTION','IN_TREATMENT','CLOSED']

  const validate = (form: Partial<Claim>) => {
    const errs: Record<string, string> = {}
    if (!form.contractId) errs.contractId = 'Le contrat est requis'
    if (!form.incidentDate) {
      errs.incidentDate = 'La date est requise'
    } else if (form.incidentDate > todayStr()) {
      errs.incidentDate = 'La date de l\'incident ne peut pas être dans le futur'
    }
    if (!form.description) errs.description = 'La description est requise'
    if (!form.location) errs.location = 'Le lieu est requis'
    return errs
  }

  const loadHistory = async (id: number) => {
    setHistoryLoading(true)
    try {
      const res = await claimsApi.getHistory(id)
      setHistory(res.data)
    } catch { setHistory([]) }
    finally { setHistoryLoading(false) }
  }

  const openView = (claim: Partial<Claim>, tab: 'details' | 'history' = 'details') => {
    setCurrent(claim)
    setModalMode('view')
    setActiveTab(tab)
    if (tab === 'history' && claim.id) loadHistory(claim.id)
  }

  const handleSave = async () => {
    const errs = validate(current)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    try {
      if (modalMode === 'create') {
        await claimsApi.create({
          contractId: current.contractId!,
          incidentDate: current.incidentDate!,
          declarationDate: current.declarationDate,
          incidentType: current.incidentType!,
          description: current.description!,
          location: current.location!,
          isThirdPartyInvolved: current.isThirdPartyInvolved || false,
        })
        showToast('Sinistre declare avec succes')
      } else if (modalMode === 'edit' && current.id) {
        await claimsApi.update(current.id, {
          status: current.status,
          assignedTo: current.assignedTo || undefined,
          description: current.description,
        })
        if (current.indemnityAmount && current.status === 'IN_TREATMENT') {
          const eligible = await claimsApi.getEligibleGuarantees(current.id)
          const firstCode = eligible.data?.[0]?.codeGarantie
          if (firstCode) {
            await claimsApi.setIndemnity(current.id, {
              indemnityAmount: current.indemnityAmount,
              codeGarantie: firstCode,
            })
          }
        }
        showToast('Sinistre mis a jour')
      }
      await refreshClaims()
      setModalMode(null)
    } catch (e: any) { showToast(e.response?.data?.error || 'Erreur', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="pb-24">
      <div className="flex justify-end mb-6">
        <button
          onClick={() => { setCurrent(emptyClaim()); setErrors({}); setModalMode('create') }}
          className="flex items-center gap-2 bg-[#E8003D] text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          <Plus size={18} /> Declarer un sinistre
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3 mb-4">
        {[
          { label: 'Total',          value: claims.length,                                        color: 'bg-gray-100 text-gray-700'   },
          { label: 'Ouverts',        value: claims.filter(c => c.status === 'OPEN').length,        color: 'bg-red-100 text-red-700'     },
          { label: 'En instruction', value: claims.filter(c => c.status === 'IN_INSTRUCTION').length, color: 'bg-yellow-100 text-yellow-700' },
          { label: 'En traitement',  value: claims.filter(c => c.status === 'IN_TREATMENT').length, color: 'bg-blue-100 text-blue-700'  },
          { label: 'Clotures',       value: claims.filter(c => c.status === 'CLOSED').length,      color: 'bg-green-100 text-green-700' },
        ].map(s => (
          <span key={s.label} className={`${s.color} text-xs px-3 py-1.5 rounded-full font-medium`}>{s.label}: {s.value}</span>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher par N sinistre, contrat, lieu..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-44 border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Tous statuts</option>
          {claimStatuses.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
          className="w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Tous types</option>
          {incidentTypes.map(t => <option key={t} value={t}>{getIncidentTypeLabel(t)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                {['N Sinistre','Contrat','Type','Date incident','Lieu','Tiers','Statut','Assigne a','Indemnite','Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(c => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                  <td className="px-3 py-3 font-medium text-[#1A1A2E] whitespace-nowrap">{c.claimNumber}</td>
                  <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{c.contractId}</td>
                  <td className="px-3 py-3">
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{getIncidentTypeLabel(c.incidentType)}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{formatDate(c.incidentDate)}</td>
                  <td className="px-3 py-3 text-gray-700">{c.location}</td>
                  <td className="px-3 py-3">
                    {c.isThirdPartyInvolved
                      ? <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">Oui</span>
                      : <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">Non</span>}
                  </td>
                  <td className="px-3 py-3"><Badge label={getStatusLabel(c.status)} status={c.status} /></td>
                  <td className="px-3 py-3 text-gray-700 text-xs">{c.assignedTo || '--'}</td>
                  <td className="px-3 py-3 text-gray-700">{c.indemnityAmount !== null ? `${c.indemnityAmount} DT` : '--'}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openView(c, 'details')}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Voir details">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => openView(c, 'history')}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Historique">
                        <Clock size={16} />
                      </button>
                      <button onClick={() => { setCurrent(c); setErrors({}); setModalMode('edit') }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Modifier">
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">Aucun sinistre trouve</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} sur {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Precedent</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Suivant</button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalMode === 'create' || modalMode === 'edit'} onClose={() => setModalMode(null)}
        title={modalMode === 'create' ? 'Declarer un sinistre' : `Modifier sinistre #${current.claimNumber}`}
        subtitle="Remplissez les informations du sinistre" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contrat *</label>
              <select value={current.contractId || ''} onChange={e => setCurrent(p => ({ ...p, contractId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]">
                <option value="">Selectionner un contrat</option>
                {contracts.filter(c => c.status === 'ACTIVE').map(c => (
                  <option key={c.id} value={c.contractNumber}>{c.contractNumber}</option>
                ))}
              </select>
              {errors.contractId && <p className="text-red-500 text-xs mt-1">{errors.contractId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type d'incident</label>
              <select value={current.incidentType || ''} onChange={e => setCurrent(p => ({ ...p, incidentType: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]">
                {incidentTypes.map(t => <option key={t} value={t}>{getIncidentTypeLabel(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date incident *</label>
              <DatePicker value={current.incidentDate || ''} max={todayStr()}
                onChange={v => setCurrent(p => ({ ...p, incidentDate: v }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]" />
              {errors.incidentDate && <p className="text-red-500 text-xs mt-1">{errors.incidentDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date declaration</label>
              <DatePicker value={current.declarationDate || ''} max={todayStr()}
                onChange={v => setCurrent(p => ({ ...p, declarationDate: v }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Lieu *</label>
              <input value={current.location || ''} onChange={e => setCurrent(p => ({ ...p, location: e.target.value }))}
                placeholder="Ville ou adresse du sinistre"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]" />
              {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea value={current.description || ''} onChange={e => setCurrent(p => ({ ...p, description: e.target.value }))} rows={3}
                placeholder="Decrivez les circonstances du sinistre..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D] resize-none" />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={current.isThirdPartyInvolved || false}
              onChange={e => setCurrent(p => ({ ...p, isThirdPartyInvolved: e.target.checked }))} />
            Tiers implique dans le sinistre
          </label>
          {modalMode === 'edit' && (
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select value={current.status || 'OPEN'} onChange={e => setCurrent(p => ({ ...p, status: e.target.value as Claim['status'] }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]">
                  {claimStatuses.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigne a</label>
                <input value={current.assignedTo || ''} onChange={e => setCurrent(p => ({ ...p, assignedTo: e.target.value || null }))}
                  placeholder="Nom du gestionnaire"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant indemnite (DT)</label>
                <input type="number" value={current.indemnityAmount ?? ''} onChange={e => setCurrent(p => ({ ...p, indemnityAmount: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]" />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button onClick={() => setModalMode(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Annuler</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-[#E8003D] text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {modalMode === 'create' ? 'Declarer le sinistre' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View + History Modal */}
      <Modal isOpen={modalMode === 'view'} onClose={() => { setModalMode(null); setHistory([]) }}
        title={`Sinistre — ${current.claimNumber}`} size="lg">
        <div>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            {(['details', 'history'] as const).map(tab => (
              <button key={tab}
                onClick={() => {
                  setActiveTab(tab)
                  if (tab === 'history' && current.id && history.length === 0) loadHistory(current.id)
                }}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab ? 'border-[#E8003D] text-[#E8003D]' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab === 'details' ? 'Détails' : 'Historique des statuts'}
              </button>
            ))}
          </div>

          {activeTab === 'details' ? (
            <div className="grid grid-cols-2 gap-4">
              {[
                ['N Sinistre',      current.claimNumber],
                ['Contrat',         current.contractId],
                ['Type',            getIncidentTypeLabel(current.incidentType || '')],
                ['Date incident',   formatDate(current.incidentDate)],
                ['Date declaration',formatDate(current.declarationDate)],
                ['Lieu',            current.location],
                ['Tiers implique',  current.isThirdPartyInvolved ? 'Oui' : 'Non'],
                ['Statut',          getStatusLabel(current.status || '')],
                ['Assigne a',       current.assignedTo || '--'],
                ['Indemnite',       current.indemnityAmount != null ? `${current.indemnityAmount} DT` : '--'],
              ].map(([label, value]) => (
                <div key={label} className="py-2 border-b border-gray-50">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-medium text-[#1A1A2E]">{value || '--'}</p>
                </div>
              ))}
              <div className="col-span-2 py-2">
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-700">{current.description}</p>
              </div>
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
                    {history.map(h => (
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
                            {h.comment && <span>— {h.comment}</span>}
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
      </Modal>

      <ConfirmDialog isOpen={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)}
        onConfirm={() => setDeleteConfirm(null)}
        title="Supprimer le sinistre ?" message="Cette action est irreversible." confirmLabel="Supprimer" />
    </div>
  )
}
