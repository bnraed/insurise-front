import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, Building2, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { agenciesApi } from '@/services/api'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useAppState } from '@/hooks/useAppState'

interface Agency {
  id: number
  agencyCode: string
  agencyName: string
  isActive: boolean
}

const emptyAgency = (): Partial<Agency> => ({
  agencyCode: '', agencyName: '', isActive: true,
})

export default function AgenciesPage() {
  const { showToast } = useAppState()

  const [agencies, setAgencies]   = useState<Agency[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState<'create' | 'edit' | null>(null)
  const [current, setCurrent]     = useState<Partial<Agency>>(emptyAgency())
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [deleteId, setDeleteId]   = useState<number | null>(null)
  const [saving, setSaving]       = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await agenciesApi.getAll()
      setAgencies(res.data || [])
    } catch {
      showToast('Erreur chargement agences', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => agencies.filter(a => {
    const s = search.toLowerCase()
    return !s || a.agencyCode.toLowerCase().includes(s) || a.agencyName.toLowerCase().includes(s)
  }), [agencies, search])

  const validate = (form: Partial<Agency>) => {
    const errs: Record<string, string> = {}
    if (!form.agencyCode?.trim()) errs.agencyCode = 'Le code est requis'
    if (!form.agencyName?.trim()) errs.agencyName = 'Le nom est requis'
    return errs
  }

  const handleSave = async () => {
    const errs = validate(current)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    try {
      if (modal === 'create') {
        await agenciesApi.create({ agencyCode: current.agencyCode!, agencyName: current.agencyName!, isActive: true })
        showToast('Agence créée avec succès')
      } else if (current.id) {
        await agenciesApi.update(current.id, { agencyName: current.agencyName, isActive: current.isActive })
        showToast('Agence mise à jour')
      }
      await load()
      setModal(null)
    } catch (e: any) {
      showToast(e.response?.data?.message || e.response?.data?.error || 'Erreur', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await agenciesApi.delete(deleteId)
      showToast('Agence supprimée', 'info')
      await load()
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Impossible de supprimer', 'error')
    } finally {
      setDeleteId(null)
    }
  }

  const handleToggle = async (a: Agency) => {
    try {
      await agenciesApi.update(a.id, { isActive: !a.isActive })
      await load()
    } catch {
      showToast('Erreur', 'error')
    }
  }

  return (
    <div className="pb-24">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Building2 size={20} className="text-[#1E3A5F]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1E3A5F]">Gestion des Agences</h2>
            <p className="text-xs text-gray-400">{agencies.length} agence{agencies.length > 1 ? 's' : ''} enregistrée{agencies.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => { setCurrent(emptyAgency()); setErrors({}); setModal('create') }}
          className="flex items-center gap-2 bg-[#E8003D] text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          <Plus size={16} /> Nouvelle agence
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-4">
        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-full font-medium">
          Total : {agencies.length}
        </span>
        <span className="bg-green-100 text-green-700 text-xs px-3 py-1.5 rounded-full font-medium">
          Actives : {agencies.filter(a => a.isActive).length}
        </span>
        <span className="bg-red-100 text-red-700 text-xs px-3 py-1.5 rounded-full font-medium">
          Inactives : {agencies.filter(a => !a.isActive).length}
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par code ou nom d'agence..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-[#E8003D]" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                {['Code Agence', 'Nom Agence', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50 text-sm">
                  <td className="px-5 py-3">
                    <span className="font-mono bg-blue-50 text-[#1E3A5F] px-2 py-0.5 rounded text-xs font-semibold">
                      {a.agencyCode}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-[#1A1A2E]">{a.agencyName}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => handleToggle(a)} className="flex items-center gap-1.5 text-xs font-medium">
                      {a.isActive
                        ? <><ToggleRight size={18} className="text-green-500" /><span className="text-green-600">Active</span></>
                        : <><ToggleLeft size={18} className="text-gray-400" /><span className="text-gray-400">Inactive</span></>
                      }
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setCurrent({ ...a }); setErrors({}); setModal('edit') }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Modifier"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteId(a.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">
                    {search ? 'Aucune agence ne correspond à la recherche' : 'Aucune agence enregistrée'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Nouvelle agence' : 'Modifier l\'agence'}
        subtitle="Renseignez les informations de l'agence"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code Agence *
            </label>
            <input
              value={current.agencyCode || ''}
              onChange={e => setCurrent(p => ({ ...p, agencyCode: e.target.value.toUpperCase() }))}
              placeholder="Ex : AG-001"
              disabled={modal === 'edit'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D] disabled:bg-gray-50 disabled:text-gray-400 font-mono"
            />
            {errors.agencyCode && <p className="text-red-500 text-xs mt-1">{errors.agencyCode}</p>}
            {modal === 'edit' && (
              <p className="text-xs text-gray-400 mt-1">Le code ne peut pas être modifié après création.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom Agence *
            </label>
            <input
              value={current.agencyName || ''}
              onChange={e => setCurrent(p => ({ ...p, agencyName: e.target.value }))}
              placeholder="Ex : Agence Tunis Centre"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            />
            {errors.agencyName && <p className="text-red-500 text-xs mt-1">{errors.agencyName}</p>}
          </div>
          {modal === 'edit' && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={current.isActive ?? true}
                onChange={e => setCurrent(p => ({ ...p, isActive: e.target.checked }))}
              />
              Agence active
            </label>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setModal(null)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#E8003D] text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-2 disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {modal === 'create' ? 'Créer l\'agence' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer cette agence ?"
        message="⚠️ Cette action est irréversible. L'agence sera définitivement supprimée. Les utilisateurs liés ne seront pas supprimés."
        confirmLabel="Supprimer"
      />
    </div>
  )
}
