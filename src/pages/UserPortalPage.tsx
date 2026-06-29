import { useEffect, useState, useCallback } from 'react'
import {
  Car, FileText, FileCheck, AlertTriangle, LogOut,
  Shield, Plus, Loader2, Clock, User,
  ChevronDown, ChevronUp, X, RefreshCw,
  Phone, Mail, MapPin, Calendar, Hash, Settings,
} from 'lucide-react'
import { useAppState } from '@/hooks/useAppState'
import { portalApi, contractsApi, claimsApi, usersApi } from '@/services/api'
import { formatDate, getStatusLabel, getStatusColor, getIncidentTypeLabel, todayStr } from '@/utils/helpers'
import type { Vehicle, Quotation, Contract, Claim } from '@/types'
import InsuriseChat from '@/components/InsuriseChat'
import DatePicker from '@/components/ui/DatePicker'

// ─── Types ───────────────────────────────────────────────────────
interface PortalVehicle   extends Vehicle   {}
interface PortalQuotation extends Quotation {}
interface PortalContract  extends Contract  {}
interface PortalClaim     extends Claim     {}

interface HistoryEntry {
  id: number
  oldStatus: string | null
  newStatus: string
  changedBy: string
  reason?: string | null
  comment?: string | null
  changedAt: string
}

// ─── Mappers ─────────────────────────────────────────────────────
function mapV(v: any): PortalVehicle {
  return {
    id: v.id, registrationNumber: v.registrationNumber || '',
    vin: v.vin || '', make: v.make || '', manufacturer: v.manufacturer || '',
    vehicleType: v.vehicleType || '', vehicleNature: v.vehicleNature || '',
    fiscalHorsepower: v.fiscalHorsepower || '', horsepower: v.horsepower || '',
    seatingCapacity: v.seatingCapacity || '', payload: v.payload || '',
    grossVehicleWeight: v.grossVehicleWeight || '',
    marketValue: Number(v.marketValue) || 0, listPrice: Number(v.listPrice) || 0,
    vehicleAge: v.vehicleAge || '', firstRegistrationDate: v.firstRegistrationDate || '',
    licenseIssueDate: v.licenseIssueDate || '', bonusMalus: v.bonusMalus || '',
    isMandatory: v.isMandatory ?? false, userId: v.owner?.id ?? v.userId ?? 0,
  }
}
function mapQ(q: any): PortalQuotation {
  return {
    id: q.id, quoteNumber: q.quoteNumber || '',
    userId: q.user?.id ?? 0, vehicleId: q.vehicle?.id ?? 0,
    packCode: q.pack?.packCode ?? '', coverages: q.coverages || [],
    status: q.status || 'PENDING', creationDate: q.creationDate || '',
    effectiveDate: q.effectiveDate || '', expirationDate: q.expirationDate || '',
    installmentType: q.installmentType || 'ANNUAL', renewalType: q.renewalType || 'AUTOMATIC',
    estimatedPremium: Number(q.estimatedPremium) || 0,
    agencyCode: q.agencyCode || '', contractNumber: q.contractNumber || null,
  }
}
function mapC(c: any): PortalContract {
  return {
    id: c.id, contractNumber: c.contractNumber || '',
    userId: c.user?.id ?? 0, vehicleId: c.vehicle?.id ?? 0,
    effectiveDate: c.effectiveDate || '', endDate: c.endDate || '',
    paymentFrequency: c.paymentFrequency || 'ANNUAL',
    paymentMethod: c.paymentMethod || 'BANK_TRANSFER',
    totalPremium: Number(c.totalPremium) || 0,
    status: c.status || 'ACTIVE',
    agencyCode: c.agencyCode || '',
    packLabel: c.quotation?.pack?.packLabel ?? c.packLabel ?? '',
    packCode:  c.quotation?.pack?.packCode  ?? c.packCode  ?? '',
  } as PortalContract
}
function mapCl(cl: any): PortalClaim {
  return {
    id: cl.id, claimNumber: cl.claimNumber || '',
    contractId: cl.contractId || cl.contract?.id || 0,
    incidentDate: cl.incidentDate || '', declarationDate: cl.declarationDate || '',
    incidentType: cl.incidentType || '', description: cl.description || '',
    location: cl.location || '', isThirdPartyInvolved: cl.isThirdPartyInvolved ?? false,
    status: cl.status || 'OPEN', assignedTo: cl.assignedTo || '',
    indemnityAmount: cl.indemnityAmount != null ? Number(cl.indemnityAmount) : null,
    createdAt: cl.createdAt || '',
  } as PortalClaim
}

// ─── Helpers UI ──────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  ACTIVE:   'bg-green-100 text-green-700',
  DRAFT:    'bg-gray-100 text-gray-600',
  SUSPENDED:'bg-orange-100 text-orange-700',
  CANCELLED:'bg-red-100 text-red-600',
  PENDING:  'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  EXPIRED:  'bg-gray-100 text-gray-500',
  OPEN:     'bg-blue-100 text-blue-700',
  IN_INSTRUCTION: 'bg-orange-100 text-orange-700',
  CLOSED:   'bg-green-100 text-green-700',
}
const statusDots: Record<string, string> = {
  ACTIVE:'bg-green-400', DRAFT:'bg-gray-300', SUSPENDED:'bg-orange-400',
  CANCELLED:'bg-red-400', PENDING:'bg-blue-400', ACCEPTED:'bg-green-400',
  EXPIRED:'bg-gray-300', OPEN:'bg-blue-400', IN_INSTRUCTION:'bg-orange-400', CLOSED:'bg-green-400',
}

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-600'}`}>
      {getStatusLabel(status) || status}
    </span>
  )
}

function SectionCard({ icon, title, count, children, defaultOpen = true }: {
  icon: React.ReactNode; title: string; count: number
  children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#1E3A5F]/8 flex items-center justify-center text-[#1E3A5F]">
            {icon}
          </div>
          <span className="font-semibold text-[#1E3A5F] text-sm">{title}</span>
          <span className="bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">{count}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-50">{children}</div>}
    </div>
  )
}


// ─── Modal déclaration sinistre ───────────────────────────────────
function ClaimModal({ contracts, onClose, onSubmit }: {
  contracts: PortalContract[]
  onClose: () => void
  onSubmit: (d: object) => Promise<void>
}) {
  const active = contracts.filter(c => c.status === 'ACTIVE')
  const [form, setForm] = useState({
    contractId: active[0]?.contractNumber || '',
    incidentDate: todayStr(), declarationDate: todayStr(),
    incidentType: 'ACCIDENT', description: '', location: '',
    isThirdPartyInvolved: false,
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.contractId) e.contractId = 'Sélectionnez un contrat actif'
    if (!form.description.trim()) e.description = 'Description requise'
    if (!form.location.trim()) e.location = 'Lieu requis'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setSaving(true)
    try { await onSubmit(form); onClose() }
    catch { setErrors({ global: 'Erreur lors de la déclaration' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle size={18} className="text-[#E8003D]"/>
            </div>
            <h2 className="font-bold text-[#1E3A5F]">Déclarer un sinistre</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
            <X size={18}/>
          </button>
        </div>
        <div className="p-5 space-y-4">
          {active.length === 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
              Aucun contrat actif. Un contrat actif est nécessaire pour déclarer un sinistre.
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contrat concerné *</label>
            <select value={form.contractId} onChange={e => setForm(p => ({ ...p, contractId: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]/20 focus:border-[#E8003D]">
              <option value="">Sélectionner un contrat actif</option>
              {active.map(c => <option key={c.id} value={c.contractNumber}>{c.contractNumber} — {c.packLabel || c.packCode}</option>)}
            </select>
            {errors.contractId && <p className="text-xs text-red-500 mt-1">{errors.contractId}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type d'incident *</label>
              <select value={form.incidentType} onChange={e => setForm(p => ({ ...p, incidentType: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]/20 focus:border-[#E8003D]">
                {['ACCIDENT','THEFT','FIRE','NATURAL_DISASTER','VANDALISM','GLASS_BREAKAGE','OTHER'].map(t => (
                  <option key={t} value={t}>{getIncidentTypeLabel(t)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date de l'incident *</label>
              <DatePicker value={form.incidentDate} max={todayStr()}
                onChange={v => setForm(p => ({ ...p, incidentDate: v }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]/20 focus:border-[#E8003D]"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lieu de l'incident *</label>
            <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              placeholder="Ville, rue, autoroute..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]/20 focus:border-[#E8003D]"/>
            {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description *</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3} placeholder="Décrivez les circonstances de l'incident..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]/20 focus:border-[#E8003D] resize-none"/>
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.isThirdPartyInvolved}
              onChange={e => setForm(p => ({ ...p, isThirdPartyInvolved: e.target.checked }))}
              className="accent-[#E8003D] w-4 h-4"/>
            <span className="text-sm text-gray-700">Tiers impliqué dans l'incident</span>
          </label>
          {errors.global && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{errors.global}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={saving || active.length === 0}
              className="flex-1 py-3 bg-[#E8003D] hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}
              {saving ? 'Envoi...' : 'Déclarer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Panneau historique ───────────────────────────────────────────
function HistoryPanel({ title, history, loading, onClose }: {
  title: string; history: HistoryEntry[]; loading: boolean; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-sm h-full shadow-2xl overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h3 className="font-bold text-[#1E3A5F] text-sm">Historique</h3>
            <p className="text-xs text-gray-400 mt-0.5">{title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16}/></button>
        </div>
        <div className="flex-1 p-5">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-300" size={24}/></div>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Aucun historique</p>
          ) : (
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100"/>
              <div className="space-y-4">
                {history.map((h, i) => (
                  <div key={h.id} className="flex gap-4 relative">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${i === 0 ? 'bg-[#1E3A5F]' : 'bg-gray-100'}`}>
                      <Clock size={12} className={i === 0 ? 'text-white' : 'text-gray-400'}/>
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {h.oldStatus && <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[h.oldStatus] || 'bg-gray-100 text-gray-500'}`}>{getStatusLabel(h.oldStatus)}</span>}
                        {h.oldStatus && <span className="text-gray-300 text-xs">→</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[h.newStatus] || 'bg-gray-100 text-gray-600'}`}>{getStatusLabel(h.newStatus)}</span>
                      </div>
                      {(h.reason || h.comment) && <p className="text-xs text-gray-500 mt-1">{h.reason || h.comment}</p>}
                      <p className="text-xs text-gray-400 mt-1">{formatDate(h.changedAt)} · {h.changedBy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Onglet Profil ───────────────────────────────────────────────
function ProfileTab({ user }: { user: any }) {
  const fields = [
    { icon: <User size={14}/>,     label: 'Nom complet',  value: `${user.firstName || ''} ${user.lastName || ''}`.trim() || '—' },
    { icon: <Hash size={14}/>,     label: 'Identifiant',  value: user.identifier || user.username || '—' },
    { icon: <Mail size={14}/>,     label: 'Email',        value: user.email || '—' },
    { icon: <Phone size={14}/>,    label: 'Téléphone',    value: user.phone || '—' },
    { icon: <MapPin size={14}/>,   label: 'Nationalité',  value: (user as any).nationality || '—' },
    { icon: <Calendar size={14}/>, label: 'Naissance',    value: (user as any).birthDate ? formatDate((user as any).birthDate) : '—' },
  ]
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-gradient-to-r from-[#1E3A5F] to-[#2d5282] rounded-2xl text-white">
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold flex-shrink-0">
          {(user.firstName || user.username || 'U').charAt(0).toUpperCase()}{(user.lastName || '').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg leading-tight">{`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username}</p>
          <p className="text-blue-200 text-sm">{user.email}</p>
          <span className="inline-block mt-2 bg-white/20 text-white text-xs px-2.5 py-1 rounded-full">Assuré</span>
        </div>

      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-[#1E3A5F] text-sm">Informations personnelles</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-50">
          {fields.map(f => (
            <div key={f.label} className="px-5 py-4 flex items-start gap-3 border-b border-gray-50 last:border-b-0">
              <div className="w-7 h-7 rounded-lg bg-[#1E3A5F]/8 flex items-center justify-center text-[#1E3A5F] flex-shrink-0 mt-0.5">
                {f.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 uppercase tracking-wide">{f.label}</p>
                <p className="text-sm font-medium text-[#1A1A2E] mt-0.5 truncate">{f.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────
const DEFAULT_PWD = 'Insurise@2026'

export default function UserPortalPage() {
  const { currentUser, setIsAuthenticated, setCurrentPage, showToast, refreshCurrentUser } = useAppState()

  const [vehicles,   setVehicles]   = useState<PortalVehicle[]>([])
  const [quotations, setQuotations] = useState<PortalQuotation[]>([])
  const [contracts,  setContracts]  = useState<PortalContract[]>([])
  const [claims,     setClaims]     = useState<PortalClaim[]>([])
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState<'home' | 'contracts' | 'claims' | 'profile'>('home')
  const [showClaim,  setShowClaim]  = useState(false)
  const [historyPanel, setHistoryPanel] = useState<{
    open: boolean; title: string; history: HistoryEntry[]; loading: boolean
  }>({ open: false, title: '', history: [], loading: false })

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [vRes, qRes, cRes, clRes] = await Promise.all([
        portalApi.myVehicles(), portalApi.myQuotations(),
        portalApi.myContracts(), portalApi.myClaims(),
      ])
      setVehicles((vRes.data   || []).map(mapV))
      setQuotations((qRes.data || []).map(mapQ))
      setContracts((cRes.data  || []).map(mapC))
      setClaims((clRes.data    || []).map(mapCl))
    } catch (e) { console.error('portal load', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadAll()
    refreshCurrentUser()
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    setIsAuthenticated(false)
    setCurrentPage('login')
  }

  const handleDeclareClaim = async (data: object) => {
    await portalApi.declareClaim(data)
    showToast('Sinistre déclaré avec succès')
    await loadAll()
  }

  const openContractHistory = async (contract: PortalContract) => {
    setHistoryPanel({ open: true, title: `Contrat ${contract.contractNumber}`, history: [], loading: true })
    try {
      const res = await contractsApi.getHistory(contract.id)
      setHistoryPanel(p => ({ ...p, history: res.data, loading: false }))
    } catch { setHistoryPanel(p => ({ ...p, history: [], loading: false })) }
  }

  const openClaimHistory = async (claim: PortalClaim) => {
    setHistoryPanel({ open: true, title: `Sinistre ${claim.claimNumber}`, history: [], loading: true })
    try {
      const res = await claimsApi.getHistory(claim.id)
      setHistoryPanel(p => ({ ...p, history: res.data, loading: false }))
    } catch { setHistoryPanel(p => ({ ...p, history: [], loading: false })) }
  }

  const initials = currentUser
    ? `${(currentUser.firstName || currentUser.username || 'U').charAt(0)}${(currentUser.lastName || '').charAt(0)}`.toUpperCase()
    : '?'
  const fullName = currentUser
    ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username
    : 'Assuré'

  const activeContracts = contracts.filter(c => c.status === 'ACTIVE')

  const TABS = [
    { id: 'home',      label: 'Accueil',   icon: <Shield size={18}/> },
    { id: 'contracts', label: 'Contrats',  icon: <FileCheck size={18}/> },
    { id: 'claims',    label: 'Sinistres', icon: <AlertTriangle size={18}/> },
    { id: 'profile',   label: 'Profil',    icon: <User size={18}/> },
  ] as const

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-[#1E3A5F] rounded-2xl flex items-center justify-center">
            <Shield size={26} className="text-white"/>
          </div>
          <Loader2 size={28} className="animate-spin text-[#E8003D]"/>
          <p className="text-gray-400 text-sm">Chargement de votre espace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1E3A5F] rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-white"/>
            </div>
            <div>
              <span className="font-bold text-[#1E3A5F] text-base">INSUR<span className="text-[#E8003D]">ISE</span></span>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">Espace Assuré</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { loadAll(); refreshCurrentUser() }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400" title="Actualiser">
              <RefreshCw size={16}/>
            </button>
            <button onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2 hover:bg-gray-50 rounded-xl px-2 py-1.5 transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <span className="text-sm font-medium text-[#1A1A2E] hidden sm:block max-w-[120px] truncate">{fullName}</span>
            </button>
            <button onClick={handleLogout}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600" title="Déconnexion">
              <LogOut size={16}/>
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-24">

        {/* ── Tab: Accueil ──────────────────────────────────────── */}
        {activeTab === 'home' && (
          <div className="space-y-5">
            {/* Hero */}
            <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2d5282] rounded-2xl p-6 text-white">
              <p className="text-blue-200 text-sm mb-1">Bonjour 👋</p>
              <h1 className="text-2xl font-bold">{fullName.split(' ')[0]}</h1>
              <p className="text-blue-200 text-sm mt-2">Bienvenue dans votre espace assuré</p>
              <button onClick={() => setShowClaim(true)}
                className="mt-4 flex items-center gap-2 bg-[#E8003D] hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
                <Plus size={16}/> Déclarer un sinistre
              </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Car size={18}/>, label: 'Véhicules', value: vehicles.length, color: 'text-[#1E3A5F] bg-blue-50', tab: null },
                { icon: <FileCheck size={18}/>, label: 'Contrats actifs', value: activeContracts.length, color: 'text-green-600 bg-green-50', tab: 'contracts' },
                { icon: <FileText size={18}/>, label: 'Devis en cours', value: quotations.filter(q => q.status === 'PENDING').length, color: 'text-orange-600 bg-orange-50', tab: null },
                { icon: <AlertTriangle size={18}/>, label: 'Sinistres ouverts', value: claims.filter(c => c.status === 'OPEN').length, color: 'text-[#E8003D] bg-red-50', tab: 'claims' },
              ].map(k => (
                <button key={k.label}
                  onClick={() => k.tab && setActiveTab(k.tab as any)}
                  className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-left transition-all ${k.tab ? 'hover:shadow-md hover:border-gray-200 cursor-pointer' : 'cursor-default'}`}>
                  <div className={`w-9 h-9 rounded-xl ${k.color} flex items-center justify-center mb-3`}>{k.icon}</div>
                  <p className="text-2xl font-bold text-[#1E3A5F]">{k.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
                </button>
              ))}
            </div>

            {/* Véhicules */}
            <SectionCard icon={<Car size={15}/>} title="Mes Véhicules" count={vehicles.length}>
              {vehicles.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Aucun véhicule enregistré</p>
              ) : (
                <div className="space-y-3 mt-4">
                  {vehicles.map(v => (
                    <div key={v.id} className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl hover:border-[#1E3A5F]/20 transition-colors">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Car size={18} className="text-[#1E3A5F]"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm text-[#1A1A2E]">{v.make || 'Véhicule'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{v.vehicleType}</p>
                          </div>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-mono flex-shrink-0">{v.registrationNumber}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                          {v.marketValue > 0 && <span>💰 {v.marketValue.toLocaleString()} DT</span>}
                          {v.firstRegistrationDate && <span>📅 {formatDate(v.firstRegistrationDate)}</span>}
                          {v.seatingCapacity && <span>👥 {v.seatingCapacity} places</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Contrats actifs rapide */}
            {activeContracts.length > 0 && (
              <SectionCard icon={<FileCheck size={15}/>} title="Contrats actifs" count={activeContracts.length}>
                <div className="space-y-3 mt-4">
                  {activeContracts.slice(0, 2).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"/>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-[#1A1A2E] truncate">{c.contractNumber}</p>
                          <p className="text-xs text-gray-400">{c.packLabel || c.packCode}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-[#1E3A5F]">{c.totalPremium} DT</p>
                        <p className="text-xs text-gray-400">{formatDate(c.endDate)}</p>
                      </div>
                    </div>
                  ))}
                  {activeContracts.length > 2 && (
                    <button onClick={() => setActiveTab('contracts')}
                      className="w-full text-center text-xs text-[#1E3A5F] font-medium py-2 hover:underline">
                      Voir tous les contrats →
                    </button>
                  )}
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* ── Tab: Contrats ─────────────────────────────────────── */}
        {activeTab === 'contracts' && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#1E3A5F]">Mes Contrats</h2>
            {contracts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <FileCheck size={32} className="text-gray-200 mx-auto mb-3"/>
                <p className="text-sm text-gray-400">Aucun contrat</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contracts.map(c => (
                  <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${statusDots[c.status] || 'bg-gray-300'}`}/>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-[#1A1A2E] truncate">{c.contractNumber}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{c.packLabel || c.packCode}</p>
                          </div>
                        </div>
                        <Badge status={c.status}/>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-4 text-xs text-gray-500">
                        <div><span className="text-gray-400">Début :</span> <span className="font-medium text-gray-700">{formatDate(c.effectiveDate)}</span></div>
                        <div><span className="text-gray-400">Fin :</span> <span className="font-medium text-gray-700">{formatDate(c.endDate)}</span></div>
                        <div><span className="text-gray-400">Prime :</span> <span className="font-bold text-[#1E3A5F]">{c.totalPremium} DT</span></div>
                        <div><span className="text-gray-400">Fréquence :</span> <span className="font-medium text-gray-700">{c.paymentFrequency}</span></div>
                      </div>
                    </div>
                    <div className="px-4 py-3 border-t border-gray-50 flex justify-end">
                      <button onClick={() => openContractHistory(c)}
                        className="flex items-center gap-1.5 text-xs text-[#1E3A5F] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                        <Clock size={12}/> Historique
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Devis */}
            {quotations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#1E3A5F] mb-3">Mes Devis</h3>
                <div className="space-y-2">
                  {quotations.map(q => (
                    <div key={q.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-[#1A1A2E] truncate">{q.quoteNumber}</p>
                        <p className="text-xs text-gray-400">{q.packCode} · {q.estimatedPremium} DT · {q.installmentType}</p>
                      </div>
                      <Badge status={q.status}/>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Sinistres ────────────────────────────────────── */}
        {activeTab === 'claims' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1E3A5F]">Mes Sinistres</h2>
              <button onClick={() => setShowClaim(true)}
                className="flex items-center gap-2 bg-[#E8003D] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-red-700">
                <Plus size={15}/> Déclarer
              </button>
            </div>
            {claims.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <AlertTriangle size={32} className="text-gray-200 mx-auto mb-3"/>
                <p className="text-sm text-gray-400 mb-4">Aucun sinistre déclaré</p>
                <button onClick={() => setShowClaim(true)}
                  className="flex items-center gap-2 bg-[#E8003D] text-white px-5 py-2.5 rounded-xl text-sm font-semibold mx-auto transition-colors hover:bg-red-700">
                  <Plus size={15}/> Déclarer un sinistre
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {claims.map(cl => (
                  <div key={cl.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${statusDots[cl.status] || 'bg-gray-300'}`}/>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-[#1A1A2E] truncate">{cl.claimNumber}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{getIncidentTypeLabel(cl.incidentType)}</p>
                          </div>
                        </div>
                        <Badge status={cl.status}/>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                        <div><span className="text-gray-400">Date :</span> <span className="font-medium text-gray-700">{formatDate(cl.incidentDate)}</span></div>
                        <div><span className="text-gray-400">Lieu :</span> <span className="font-medium text-gray-700 truncate block">{cl.location}</span></div>
                        {cl.indemnityAmount != null && (
                          <div><span className="text-gray-400">Indemnité :</span> <span className="font-bold text-green-600">{cl.indemnityAmount} DT</span></div>
                        )}
                        {cl.assignedTo && (
                          <div><span className="text-gray-400">Gestionnaire :</span> <span className="font-medium text-gray-700">{cl.assignedTo}</span></div>
                        )}
                      </div>
                    </div>
                    <div className="px-4 py-3 border-t border-gray-50 flex justify-end">
                      <button onClick={() => openClaimHistory(cl)}
                        className="flex items-center gap-1.5 text-xs text-[#1E3A5F] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                        <Clock size={12}/> Historique
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Profil ───────────────────────────────────────── */}
        {activeTab === 'profile' && currentUser && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#1E3A5F]">Mon Profil</h2>
            <ProfileTab user={currentUser}/>
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-xl text-sm font-medium transition-colors">
              <LogOut size={16}/> Se déconnecter
            </button>
          </div>
        )}
      </main>

      {/* ── Bottom Nav ──────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-20 safe-area-pb">
        <div className="max-w-2xl mx-auto flex">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative
                ${activeTab === tab.id ? 'text-[#1E3A5F]' : 'text-gray-400 hover:text-gray-600'}`}>
              {activeTab === tab.id && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#E8003D] rounded-full"/>
              )}
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
              {tab.id === 'claims' && claims.filter(c => c.status === 'OPEN').length > 0 && (
                <span className="absolute top-2 right-1/4 w-4 h-4 bg-[#E8003D] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {claims.filter(c => c.status === 'OPEN').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Modals ──────────────────────────────────────────────── */}
      {showClaim && (
        <ClaimModal contracts={contracts} onClose={() => setShowClaim(false)} onSubmit={handleDeclareClaim}/>
      )}


<InsuriseChat />

      {historyPanel.open && (
        <HistoryPanel
          title={historyPanel.title}
          history={historyPanel.history}
          loading={historyPanel.loading}
          onClose={() => setHistoryPanel(p => ({ ...p, open: false }))}
        />
      )}
    </div>
  )
}
