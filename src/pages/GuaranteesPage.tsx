import { useState } from 'react'
import { Plus, Pencil, Trash2, Shield, Package, Loader2, Eye } from 'lucide-react'
import { useAppState } from '@/hooks/useAppState'
import { guaranteesApi, packsApi } from '@/services/api'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Badge from '@/components/ui/Badge'
import type { Guarantee, Pack } from '@/types'

export default function GuaranteesPage() {
  const { guarantees, packs, refreshGuarantees, refreshPacks, refreshQuotations, refreshContracts, refreshClaims, showToast } = useAppState()
  const [activeTab, setActiveTab] = useState<'guarantees' | 'packs'>('guarantees')
  const [saving, setSaving] = useState(false)

  // ── Guarantee state ────────────────────────────────────────────
  const [gModal, setGModal]     = useState<'create' | 'edit' | null>(null)
  const [currentG, setCurrentG] = useState<Partial<Guarantee>>({})
  const [gErrors, setGErrors]   = useState<Record<string, string>>({})
  const [deleteG, setDeleteG]   = useState<number | null>(null)

  // ── Pack state ─────────────────────────────────────────────────
  const [pModal, setPModal]     = useState<'create' | 'edit' | 'view' | null>(null)
  const [currentP, setCurrentP] = useState<Partial<Pack>>({ guarantees: [] })
  const [pErrors, setPErrors]   = useState<Record<string, string>>({})
  const [deleteP, setDeleteP]   = useState<number | null>(null)

  // ── Guarantee handlers ─────────────────────────────────────────
  const saveGuarantee = async () => {
    const errs: Record<string, string> = {}
    if (!currentG.codeGarantie)    errs.codeGarantie    = 'Le code est requis'
    if (!currentG.libelleGarantie) errs.libelleGarantie = 'Le nom est requis'
    if (!currentG.taux)            errs.taux             = 'Le taux est requis'
    if (!currentG.type)            errs.type             = 'Le type est requis'
    setGErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    try {
      if (gModal === 'create') {
        await guaranteesApi.create({
          codeGarantie:    currentG.codeGarantie!,
          libelleGarantie: currentG.libelleGarantie!,
          type:            currentG.type || 'OPTIONAL',
          capitalAssure:   currentG.capitalAssure || '0',
          franchise:       currentG.franchise || '0',
          taux:            currentG.taux!,
          isActive:        true,
          description:     currentG.description,
        })
        showToast('Garantie créée avec succès')
      } else if (currentG.id) {
        await guaranteesApi.update(currentG.id, currentG)
        showToast('Garantie mise à jour')
      }
      await refreshGuarantees()
      setGModal(null)
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Erreur', 'error')
    } finally { setSaving(false) }
  }

  const handleToggleG = async (id: number) => {
    try { await guaranteesApi.toggle(id); await refreshGuarantees() }
    catch { showToast('Erreur', 'error') }
  }

  const handleDeleteG = async (id: number) => {
    try {
      const res = await guaranteesApi.delete(id)
      const data = res.data || {}
      await refreshGuarantees()
      await refreshContracts()
      setDeleteG(null)
      const msg = data.message || 'Garantie supprimée'
      showToast(msg, data.contractsDeleted > 0 ? 'warning' : 'info')
    } catch (e: any) { showToast(e.response?.data?.error || 'Erreur', 'error') }
  }

  // ── Pack handlers ──────────────────────────────────────────────
  const savePack = async () => {
    const errs: Record<string, string> = {}
    if (!currentP.packCode)  errs.packCode  = 'Le code est requis'
    if (!currentP.packLabel) errs.packLabel = 'Le nom est requis'
    setPErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    try {
      if (pModal === 'create') {
        await packsApi.create({
          packCode: currentP.packCode!, packLabel: currentP.packLabel!, isActive: true,
          basePremium: currentP.basePremium, description: currentP.description,
          version: currentP.version, guarantees: currentP.guarantees || [],
        })
        showToast('Pack créé avec succès')
      } else if (currentP.id) {
        await packsApi.update(currentP.id, { ...currentP, guarantees: currentP.guarantees || [] })
        showToast('Pack mis à jour')
      }
      await refreshPacks()
      setPModal(null)
    } catch (e: any) { showToast(e.response?.data?.error || 'Erreur', 'error') }
    finally { setSaving(false) }
  }

  const handleDeleteP = async (id: number) => {
    setSaving(true)
    try {
      const res = await packsApi.delete(id)
      const data = res.data || {}
      await Promise.all([refreshPacks(), refreshQuotations(), refreshContracts(), refreshClaims()])
      setDeleteP(null)
      showToast(data.message || 'Pack supprimé', data.contractsDeleted > 0 ? 'warning' : 'success')
    } catch (e: any) {
      await refreshPacks()
      setDeleteP(null)
      showToast(e.response?.data?.error || 'Erreur suppression pack', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleGuaranteeInPack = (code: string) => {
    setCurrentP(prev => {
      const curr = prev.guarantees || []
      return { ...prev, guarantees: curr.includes(code) ? curr.filter(c => c !== code) : [...curr, code] }
    })
  }

  // Garanties séparées par type
  const packGuarantees     = guarantees.filter(g => g.type === 'PACK')
  const optionalGuarantees = guarantees.filter(g => g.type === 'OPTIONAL')

  const tabs = [
    { key: 'guarantees' as const, label: 'Garanties', icon: <Shield size={16} />,  count: guarantees.length },
    { key: 'packs'      as const, label: 'Packs',     icon: <Package size={16} />, count: packs.length      },
  ]

  const typeBadge = (type: string) =>
    type === 'PACK'
      ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">Pack</span>
      : <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">Optionnelle</span>

  return (
    <div className="pb-24">
      <p className="text-gray-500 text-sm mb-6">
        Définissez les garanties disponibles et leurs regroupements en packs
      </p>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'border-b-2 border-[#E8003D] text-[#E8003D]' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.icon} {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* ── GARANTIES TAB ─────────────────────────────────────────── */}
      {activeTab === 'guarantees' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-3">
              <span className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                Total : {guarantees.length}
              </span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                Pack : {packGuarantees.length}
              </span>
            </div>
            <button
              onClick={() => { setCurrentG({ type: 'PACK', taux: '0', capitalAssure: '0', franchise: '0' }); setGErrors({}); setGModal('create') }}
              className="flex items-center gap-2 px-4 py-2 bg-[#E8003D] text-white rounded-xl hover:bg-red-700 text-sm font-medium transition-colors">
              <Plus size={16} /> Nouvelle garantie
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {['Code','Libellé','Type','Capital Assuré','Franchise','Taux (%)','Statut','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guarantees.map(g => (
                  <tr key={g.id} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-700 font-mono text-xs px-2 py-1 rounded">{g.codeGarantie}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1A1A2E]">{g.libelleGarantie}</td>
                    <td className="px-4 py-3">{typeBadge(g.type)}</td>
                    <td className="px-4 py-3 text-gray-700">{g.capitalAssure || '--'}</td>
                    <td className="px-4 py-3 text-gray-700">{g.franchise || '--'}</td>
                    <td className="px-4 py-3 text-gray-700">{g.taux}%</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleG(g.id)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${g.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${g.isActive ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setCurrentG(g); setGErrors({}); setGModal('edit') }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={16} /></button>
                        <button onClick={() => setDeleteG(g.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {guarantees.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Aucune garantie</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PACKS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'packs' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-3">
              <span className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                Total : {packs.length}
              </span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-green-100 text-green-700 font-medium">
                Actifs : {packs.filter(p => p.isActive).length}
              </span>
            </div>
            <button
              onClick={() => { setCurrentP({ guarantees: [] }); setPErrors({}); setPModal('create') }}
              className="flex items-center gap-2 bg-[#E8003D] text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              <Plus size={18} /> Créer un pack
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {['Code', 'Nom', 'Description', 'Prime de base', 'Garanties', 'Version', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {packs.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-700 font-mono text-xs px-2 py-1 rounded">{p.packCode}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1A1A2E] whitespace-nowrap">{p.packLabel}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{p.description || '--'}</td>
                    <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{p.basePremium || 0} DT</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {(p.guarantees || []).length === 0 ? (
                          <span className="text-gray-400 text-xs">--</span>
                        ) : (p.guarantees || []).slice(0, 3).map(code => {
                          const g = guarantees.find(x => x.codeGarantie === code)
                          return (
                            <span key={code} className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                              g?.type === 'PACK' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {code}
                            </span>
                          )
                        })}
                        {(p.guarantees || []).length > 3 && (
                          <span className="text-xs text-gray-400">+{(p.guarantees || []).length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.version || '--'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {p.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setCurrentP({ ...p, guarantees: p.guarantees || [] }); setPModal('view') }}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Voir"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => { setCurrentP({ ...p, guarantees: p.guarantees || [] }); setPErrors({}); setPModal('edit') }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Modifier"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteP(p.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {packs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">Aucun pack créé</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL CRÉATION / ÉDITION GARANTIE ─────────────────────── */}
      <Modal
        isOpen={gModal === 'create' || gModal === 'edit'}
        onClose={() => setGModal(null)}
        title={gModal === 'create' ? 'Créer une garantie' : 'Modifier la garantie'}
        subtitle="Renseignez les paramètres de couverture"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input
                value={currentG.codeGarantie || ''}
                onChange={e => setCurrentG(p => ({ ...p, codeGarantie: e.target.value.toUpperCase() }))}
                disabled={gModal === 'edit'}
                placeholder="EX: GAR001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D] font-mono disabled:bg-gray-50 disabled:text-gray-400"
              />
              {gErrors.codeGarantie && <p className="text-red-500 text-xs mt-1">{gErrors.codeGarantie}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taux (%) *</label>
              <input
                type="number" step="0.01"
                value={currentG.taux || ''}
                onChange={e => setCurrentG(p => ({ ...p, taux: e.target.value }))}
                placeholder="Ex : 1.20"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
              />
              {gErrors.taux && <p className="text-red-500 text-xs mt-1">{gErrors.taux}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Libellé *</label>
            <input
              value={currentG.libelleGarantie || ''}
              onChange={e => setCurrentG(p => ({ ...p, libelleGarantie: e.target.value }))}
              placeholder="Ex : Responsabilité Civile"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            />
            {gErrors.libelleGarantie && <p className="text-red-500 text-xs mt-1">{gErrors.libelleGarantie}</p>}
          </div>

          {/* TYPE SELECTOR */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de garantie *</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: 'PACK',
                  label: 'Pack',
                  desc: 'Incluse dans les packs d\'assurance',
                  color: 'border-blue-400 bg-blue-50',
                  dot: 'bg-blue-500',
                },
                {
                  value: 'OPTIONAL',
                  label: 'Optionnelle',
                  desc: 'Proposée en supplément au client',
                  color: 'border-orange-400 bg-orange-50',
                  dot: 'bg-orange-500',
                },
                ].map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                    currentG.type === opt.value ? opt.color : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <input
                    type="radio" name="gtype" value={opt.value}
                    checked={currentG.type === opt.value}
                    onChange={() => setCurrentG(p => ({ ...p, type: opt.value as 'PACK' | 'OPTIONAL' }))}
                    className="mt-0.5 accent-[#E8003D]"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                      <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            {gErrors.type && <p className="text-red-500 text-xs mt-1">{gErrors.type}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capital Assuré</label>
              <input
                value={currentG.capitalAssure || ''}
                onChange={e => setCurrentG(p => ({ ...p, capitalAssure: e.target.value }))}
                placeholder="Ex : 50000 ou SERVICE"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Franchise</label>
              <input
                value={currentG.franchise || ''}
                onChange={e => setCurrentG(p => ({ ...p, franchise: e.target.value }))}
                placeholder="Ex : 500 ou AUCUNE"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={currentG.description || ''}
              onChange={e => setCurrentG(p => ({ ...p, description: e.target.value }))}
              rows={2} placeholder="Description de la garantie..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button onClick={() => setGModal(null)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
              Annuler
            </button>
            <button onClick={saveGuarantee} disabled={saving}
              className="px-4 py-2 bg-[#E8003D] text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {gModal === 'create' ? 'Créer la garantie' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL CRÉATION / ÉDITION PACK ─────────────────────────── */}
      <Modal
        isOpen={pModal === 'create' || pModal === 'edit'}
        onClose={() => setPModal(null)}
        title={pModal === 'create' ? 'Créer un pack' : 'Modifier le pack'}
        subtitle="Configurez le pack et sélectionnez ses garanties"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input value={currentP.packCode || ''} onChange={e => setCurrentP(p => ({ ...p, packCode: e.target.value }))}
                placeholder="PACK_CODE"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]" />
              {pErrors.packCode && <p className="text-red-500 text-xs mt-1">{pErrors.packCode}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prime de base (DT)</label>
              <input type="number" value={currentP.basePremium || ''} onChange={e => setCurrentP(p => ({ ...p, basePremium: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input value={currentP.packLabel || ''} onChange={e => setCurrentP(p => ({ ...p, packLabel: e.target.value }))}
              placeholder="Nom du pack"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]" />
            {pErrors.packLabel && <p className="text-red-500 text-xs mt-1">{pErrors.packLabel}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={currentP.description || ''} onChange={e => setCurrentP(p => ({ ...p, description: e.target.value }))} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D] resize-none" />
          </div>

          {/* ── Garanties PACK (type === PACK) ───────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <label className="text-sm font-medium text-gray-700">Garanties Pack</label>
              <span className="text-xs text-gray-400">— garanties de type "Pack"</span>
            </div>
            <div className="border-2 border-blue-100 bg-blue-50/40 rounded-xl p-3 space-y-1.5 max-h-44 overflow-y-auto">
              {packGuarantees.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">
                  Aucune garantie de type Pack disponible — créez-en dans l'onglet Garanties
                </p>
              ) : packGuarantees.map(g => (
                <label key={g.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer text-sm transition-colors ${
                  (currentP.guarantees || []).includes(g.codeGarantie) ? 'bg-blue-100' : 'hover:bg-blue-100/60'
                }`}>
                  <input type="checkbox"
                    checked={(currentP.guarantees || []).includes(g.codeGarantie)}
                    onChange={() => toggleGuaranteeInPack(g.codeGarantie)}
                    className="accent-blue-600" />
                  <span className="bg-blue-200 text-blue-800 font-mono text-xs px-1.5 py-0.5 rounded">{g.codeGarantie}</span>
                  <span className="text-gray-700 flex-1">{g.libelleGarantie}</span>
                  <span className="text-xs text-blue-400">{g.taux}%</span>
                </label>
              ))}
            </div>
          </div>



          <p className="text-xs text-gray-500">
            {(currentP.guarantees || []).length} garantie(s) sélectionnée(s) au total
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button onClick={() => setPModal(null)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
              Annuler
            </button>
            <button onClick={savePack} disabled={saving}
              className="px-4 py-2 bg-[#E8003D] text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {pModal === 'create' ? 'Créer le pack' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL VIEW PACK ───────────────────────────────────────── */}
      <Modal isOpen={pModal === 'view'} onClose={() => setPModal(null)} title={`Pack : ${currentP.packLabel}`}>
        <div className="space-y-3">
          {[
            ['Code',          currentP.packCode],
            ['Nom',           currentP.packLabel],
            ['Description',   currentP.description],
            ['Prime de base', `${currentP.basePremium || 0} DT`],
            ['Version',       currentP.version],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-medium text-[#1A1A2E]">{value || '--'}</span>
            </div>
          ))}
          <div>
            <p className="text-sm text-gray-500 mb-2">Garanties incluses :</p>
            {(currentP.guarantees || []).length === 0 ? (
              <p className="text-xs text-gray-400">Aucune garantie</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(currentP.guarantees || []).map(code => {
                  const g = guarantees.find(x => x.codeGarantie === code)
                  return (
                    <span key={code} className={`text-xs px-2 py-1 rounded font-mono ${
                      g?.type === 'PACK' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {code}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteG !== null} onClose={() => setDeleteG(null)}
        onConfirm={() => deleteG && handleDeleteG(deleteG)}
        title="Supprimer la garantie ?" message="⚠️ Cette action est irréversible. Tous les contrats utilisant cette garantie seront également supprimés." confirmLabel="Supprimer" />
      <ConfirmDialog isOpen={deleteP !== null} onClose={() => setDeleteP(null)}
        onConfirm={() => deleteP && handleDeleteP(deleteP)}
        title="Supprimer le pack ?" message="⚠️ Cette action est irréversible. Tous les devis, contrats et sinistres liés à ce pack seront également supprimés." confirmLabel="Supprimer" />
    </div>
  )
}
