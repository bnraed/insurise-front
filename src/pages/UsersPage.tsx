import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Filter, Eye, Pencil, Trash2, Car, Loader2 } from 'lucide-react'
import { useAppState } from '@/hooks/useAppState'
import { usersApi, agenciesApi } from '@/services/api'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Badge from '@/components/ui/Badge'
import type { User } from '@/types'

const emptyUser = (): Partial<User> & { password?: string } => ({
  firstName: '', lastName: '', identifier: '', username: '',
  email: '', phone: '', type: 'physique', agencyId: 1, role: 'USER' as const,
  password: '',
})

export default function UsersPage() {
  const { users, vehicles, refreshUsers, showToast } = useAppState()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view' | null>(null)
  const [currentUser, setCurrentUser] = useState<Partial<User>>(emptyUser())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [vehicleModal, setVehicleModal] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [agencies, setAgencies] = useState<{ id: number; agencyCode: string; agencyName: string }[]>([])

  useEffect(() => {
    agenciesApi.getActive().then(res => setAgencies(res.data || [])).catch(() => {})
  }, [])
  const perPage = 10

  const filtered = useMemo(() => users.filter((u) => {
    const s = search.toLowerCase()
    return (
      (!s || u.firstName.toLowerCase().includes(s) || u.lastName.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) || u.identifier.toLowerCase().includes(s)) &&
      (!typeFilter || u.type === typeFilter)
    )
  }), [users, search, typeFilter])

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const validate = (form: Partial<User>) => {
    const errs: Record<string, string> = {}
    if (!form.firstName) errs.firstName = 'Le prenom est requis'
    if (!form.lastName)  errs.lastName  = 'Le nom est requis'
    if (!form.identifier) errs.identifier = 'Le National ID est requis'
    if (!form.username)  errs.username  = 'Le username est requis'
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email invalide'
    return errs
  }

  const handleSave = async () => {
    const errs = validate(currentUser)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    try {
      const basePayload = {
        firstName:  currentUser.firstName,
        lastName:   currentUser.lastName,
        email:      currentUser.email,
        phone:      currentUser.phone || '',
        username:   currentUser.username,
        identifier: currentUser.identifier,
        type:       currentUser.type,
        agencyId:   currentUser.agencyId || undefined,
        role:       currentUser.role || 'USER',
      }
      if (modalMode === 'create') {
        await usersApi.create({ ...basePayload, password: (currentUser as any).password || 'Insurise@2026' })
        showToast('Utilisateur cree avec succes')
      } else if (modalMode === 'edit' && currentUser.id) {
        const editPayload: any = { ...basePayload }
        const pwd = (currentUser as any).password
        if (pwd) editPayload.password = pwd
        await usersApi.update(currentUser.id, editPayload)
        showToast('Utilisateur mis a jour')
      }
      await refreshUsers()
      setModalMode(null)
    } catch (e: any) {
      console.error('handleSave error:', e.response ?? e)
      const data = e.response?.data
      const msg = (typeof data === 'string' ? data : data?.error || data?.message || data?.detail) || e.message || 'Erreur lors de la sauvegarde'
      showToast(msg, 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    try {
      await usersApi.delete(id)
      await refreshUsers()
      setDeleteConfirm(null)
      showToast('Supprime avec succes', 'info')
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Erreur suppression', 'error')
    }
  }

  const userVehicles = vehicleModal ? vehicles.filter(v => v.userId === vehicleModal.id) : []

  return (
    <div className="pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <p className="text-gray-500 text-sm">Gerez les possesseurs de vehicules</p>
        <button onClick={() => { setCurrentUser(emptyUser()); setErrors({}); setModalMode('create') }}
          className="flex items-center gap-2 bg-[#E8003D] text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium">
          <Plus size={18} /> Nouvel utilisateur
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher par nom, email, National ID..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]" />
        </div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Tous les types</option>
          <option value="physique">Personne physique</option>
          <option value="morale">Personne morale</option>
        </select>
        <button className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm">
          <Filter size={16} /> Filtrer
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-3">{filtered.length} utilisateurs trouves</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                {['ID','Nom complet','Identifiant','Email','Rôle','Type','Nb Véhicules','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                  <td className="px-4 py-3 text-gray-700">{u.id}</td>
                  <td className="px-4 py-3 font-medium text-[#1A1A2E]">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-gray-700">{u.username}</td>
                  <td className="px-4 py-3 text-gray-700">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge label={(u as any).role === 'AGENT' ? 'Agent' : 'Client'}
                      className={(u as any).role === 'AGENT' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={u.type === 'physique' ? 'Physique' : 'Morale'}
                      className={u.type === 'physique' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">{vehicles.filter(v => v.userId === u.id).length} vehicule(s)</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setCurrentUser(u); setModalMode('view') }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"><Eye size={16} /></button>
                      <button onClick={() => { setCurrentUser(u); setErrors({}); setModalMode('edit') }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={16} /></button>
                      <button onClick={() => setVehicleModal(u)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Car size={16} /></button>
                      {(u as any).role === 'USER' && (
                        <button onClick={() => setDeleteConfirm(u.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} sur {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Precedent</button>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Suivant</button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalMode === 'create' || modalMode === 'edit'} onClose={() => setModalMode(null)}
        title={modalMode === 'create' ? 'Creer un nouvel utilisateur' : `Modifier l'utilisateur #${currentUser.id}`}
        subtitle="Renseignez les informations officielles de l'utilisateur.">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { key:'firstName', label:'Prénom *' }, { key:'lastName', label:'Nom *' },
              { key:'identifier', label:'Identifiant national *' }, { key:'username', label:'Nom d\'utilisateur *' },
              { key:'email', label:'Email *' }, { key:'phone', label:'Téléphone' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input value={(currentUser as any)[key] || ''} onChange={(e) => setCurrentUser(p => ({...p, [key]: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]" />
                {(errors as any)[key] && <p className="text-red-500 text-xs mt-1">{(errors as any)[key]}</p>}
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
            <div className="flex gap-6">
              {(['physique','morale'] as const).map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" name="userType" checked={currentUser.type === t} onChange={() => setCurrentUser(p => ({...p, type: t}))} />
                  {t === 'physique' ? 'Personne physique' : 'Personne morale'}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agence</label>
              <select value={currentUser.agencyId || ''} onChange={(e) => setCurrentUser(p => ({...p, agencyId: Number(e.target.value)}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]">
                <option value="">-- Sélectionner une agence --</option>
                {agencies.map(a => (
                  <option key={a.id} value={a.id}>{a.agencyCode} — {a.agencyName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
              <select value={currentUser.role || 'USER'} onChange={(e) => setCurrentUser(p => ({...p, role: e.target.value as 'AGENT' | 'USER'}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]">
                <option value="USER">👤 Utilisateur (client assuré)</option>
                <option value="AGENT">🏢 Agent (accès ERP)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe {modalMode === 'create' ? '*' : '(laisser vide pour ne pas changer)'}
            </label>
            <input
              type="password"
              value={(currentUser as any).password || ''}
              onChange={(e) => setCurrentUser(p => ({...p, password: e.target.value}))}
              placeholder={modalMode === 'create' ? 'Définir un mot de passe' : 'Nouveau mot de passe (optionnel)'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]" />
            {modalMode === 'create' && !(currentUser as any).password && (
              <p className="text-xs text-amber-600 mt-1">⚠ Laissez vide pour utiliser <strong>Insurise@2026</strong> par défaut</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button onClick={() => setModalMode(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#E8003D] text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />} Enregistrer
            </button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={modalMode === 'view'} onClose={() => setModalMode(null)} title={`Utilisateur #${currentUser.id}`} subtitle="Informations detaillees">
        <div className="space-y-3">
          {[
            ['Nom complet', `${currentUser.firstName} ${currentUser.lastName}`],
            ['Nom d\'utilisateur', currentUser.username], ['Email', currentUser.email],
            ['Téléphone', currentUser.phone || '--'],
            ['Type', currentUser.type === 'physique' ? 'Personne physique' : 'Personne morale'],
            ['Identifiant national', currentUser.identifier], ['Agence (ID)', String(currentUser.agencyId)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-medium text-[#1A1A2E]">{value}</span>
            </div>
          ))}
        </div>
      </Modal>

      {/* Vehicles Modal */}
      <Modal isOpen={!!vehicleModal} onClose={() => setVehicleModal(null)} title={`Vehicules de ${vehicleModal?.firstName} ${vehicleModal?.lastName}`}>
        <div className="space-y-3">
          {userVehicles.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Aucun vehicule associe</p>
          ) : userVehicles.map(v => (
            <div key={v.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Car size={20} className="text-[#1E3A5F]" />
              <div>
                <p className="text-sm font-medium">{v.registrationNumber} -- {v.make} {v.vehicleType}</p>
                <p className="text-xs text-gray-500">Valeur: {v.marketValue.toLocaleString()} DT</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Supprimer l'utilisateur ?"
        message="⚠️ Cette action est irréversible. L'utilisateur et tous ses véhicules associés seront définitivement supprimés."
        confirmLabel="Supprimer" />
    </div>
  )
}
