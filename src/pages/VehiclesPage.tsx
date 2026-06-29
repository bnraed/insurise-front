import { useState, useMemo } from 'react'
import { Plus, Search, Filter, Eye, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useAppState } from '@/hooks/useAppState'
import { vehiclesApi } from '@/services/api'
import Modal from '@/components/ui/Modal'
import DatePicker from '@/components/ui/DatePicker'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { Vehicle } from '@/types'
import { todayStr } from '@/utils/helpers'

// Tous les champs du backend VehicleDTO.Request
const emptyVehicle = (nationalId = ''): Partial<Vehicle> & { nationalId?: string } => ({
  registrationNumber:   '',
  vin:                  '',
  make:                 '',
  manufacturer:         '',
  vehicleType:          '',
  vehicleNature:        '',
  fiscalHorsepower:     '',
  horsepower:           '',
  seatingCapacity:      '5',
  payload:              '',
  grossVehicleWeight:   '',
  marketValue:          0,
  listPrice:            0,
  vehicleAge:           '',
  firstRegistrationDate: todayStr(),
  licenseIssueDate:     todayStr(),
  bonusMalus:           '1.00',
  isMandatory:          true,
  userId:               null,
  nationalId:           nationalId,
})

const VEHICLE_TYPES    = ['SUV', 'Berline', 'Pickup', 'Utilitaire', 'Moto', 'Tourisme', 'Break']
const VEHICLE_NATURES  = ['Véhicule de tourisme', 'Commercial', 'Particulier', 'Autre']
const FISCAL_OPTIONS   = ['4', '5', '6', '7', '8', '10', '12', '14+']

export default function VehiclesPage() {
  const { vehicles, users, refreshVehicles, getUserById, showToast } = useAppState()
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [modalMode, setModalMode]   = useState<'create' | 'edit' | 'view' | null>(null)
  const [current, setCurrent]       = useState<Partial<Vehicle> & { nationalId?: string }>(emptyVehicle())
  const [errors, setErrors]         = useState<Record<string, string>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [saving, setSaving]         = useState(false)
  const [page, setPage]             = useState(1)
  const perPage = 10

  const filtered = useMemo(() => vehicles.filter(v => {
    const s = search.toLowerCase()
    return (
      (!s ||
        v.registrationNumber.toLowerCase().includes(s) ||
        (v.vin || '').toLowerCase().includes(s) ||
        (v.make || '').toLowerCase().includes(s)) &&
      (!typeFilter  || v.vehicleType === typeFilter) &&
      (!ownerFilter || String(v.userId) === ownerFilter)
    )
  }), [vehicles, search, typeFilter, ownerFilter])

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated  = filtered.slice((page - 1) * perPage, page * perPage)

  const validate = (form: Partial<Vehicle> & { nationalId?: string }) => {
    const errs: Record<string, string> = {}
    if (!form.registrationNumber) errs.registrationNumber = 'La matricule est requise'
    if (!form.nationalId?.trim()) errs.nationalId = 'Le CIN/National ID est requis'
    if (!form.vehicleType)        errs.vehicleType = 'Le type de véhicule est requis'
    return errs
  }

  const handleSave = async () => {
    const errs = validate(current)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    try {
      // Construire le payload exact attendu par VehicleDTO.Request du back
      const payload = {
        registrationNumber:   current.registrationNumber,
        vin:                  current.vin                || null,
        make:                 current.make               || null,
        manufacturer:         current.manufacturer       || null,
        vehicleType:          current.vehicleType        || null,
        vehicleNature:        current.vehicleNature      || null,
        fiscalHorsepower:     current.fiscalHorsepower   || null,
        horsepower:           current.horsepower         || null,
        seatingCapacity:      current.seatingCapacity    || null,
        payload:              current.payload            || null,
        grossVehicleWeight:   current.grossVehicleWeight || null,
        marketValue:          current.marketValue != null ? Number(current.marketValue) : null,
        listPrice:            current.listPrice   != null ? Number(current.listPrice)   : null,
        vehicleAge:           current.vehicleAge          || null,
        firstRegistrationDate: current.firstRegistrationDate || null,
        licenseIssueDate:     current.licenseIssueDate    || null,
        bonusMalus:           current.bonusMalus          || null,
        isMandatory:          current.isMandatory         ?? true,
        userId:               current.userId ? Number(current.userId) : null,
      }

      if (modalMode === 'create') {
        await vehiclesApi.create(payload)
        showToast('Vehicule enregistre')
      } else if (current.id) {
        await vehiclesApi.update(current.id, payload)
        showToast('Vehicule mis a jour')
      }
      await refreshVehicles()
      setModalMode(null)
    } catch (e: any) {
      showToast(e.response?.data?.error || e.message || 'Erreur', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await vehiclesApi.delete(id)
      await refreshVehicles()
      setDeleteConfirm(null)
      showToast('Vehicule supprime', 'info')
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Erreur suppression', 'error')
    }
  }

  // ── Formulaire complet avec TOUS les champs du backend ──────────
  const renderForm = () => (
    <div className="space-y-6">

      {/* Section 1: Identification */}
      <div>
        <h3 className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider mb-3 pb-1 border-b border-gray-100">
          Informations générales
        </h3>
        <p className="text-xs text-gray-400 mb-3">Saisissez l'immatriculation et les données d'identification.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numéro d'immatriculation *</label>
            <input
              value={current.registrationNumber || ''}
              onChange={e => setCurrent(p => ({ ...p, registrationNumber: e.target.value }))}
              placeholder="ABC-123-XYZ"
              disabled={modalMode === 'edit'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D] disabled:bg-gray-50"
            />
            {errors.registrationNumber && <p className="text-red-500 text-xs mt-1">{errors.registrationNumber}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Propriétaire
              <span className="ml-1 text-xs text-gray-400 font-normal">— optionnel</span>
            </label>
            <select
              value={current.userId || ''}
              onChange={e => {
                const uid = Number(e.target.value) || 0
                const selectedUser = users.find(u => u.id === uid)
                setCurrent(p => ({
                  ...p,
                  userId: uid || undefined,
                  // Auto-remplir le National ID depuis l'utilisateur sélectionné
                  nationalId: selectedUser?.identifier || p.nationalId || '',
                }))
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            >
              <option value="">-- Sans propriétaire</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.identifier})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CIN / Identifiant national *</label>
            <input
              value={(current as any).nationalId || ''}
              onChange={e => setCurrent(p => ({ ...p, nationalId: e.target.value }))}
              placeholder="Ex : AB123456"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            />
            {errors.nationalId && <p className="text-red-500 text-xs mt-1">{errors.nationalId}</p>}
            {current.userId && (
              <p className="text-xs text-green-600 mt-1">✓ Auto-rempli depuis le propriétaire sélectionné</p>
            )}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">VIN (Numéro d'identification du véhicule)</label>
            <input
              value={current.vin || ''}
              onChange={e => setCurrent(p => ({ ...p, vin: e.target.value }))}
              placeholder="1HGCM82633A123456"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
            <input
              value={current.make || ''}
              onChange={e => setCurrent(p => ({ ...p, make: e.target.value }))}
              placeholder="Honda"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fabricant</label>
            <input
              value={current.manufacturer || ''}
              onChange={e => setCurrent(p => ({ ...p, manufacturer: e.target.value }))}
              placeholder="Honda Motor Co., Ltd."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de véhicule *</label>
            <select
              value={current.vehicleType || ''}
              onChange={e => setCurrent(p => ({ ...p, vehicleType: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            >
              <option value="">Sélectionner le type</option>
              {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.vehicleType && <p className="text-red-500 text-xs mt-1">{errors.vehicleType}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nature du véhicule</label>
            <select
              value={current.vehicleNature || ''}
              onChange={e => setCurrent(p => ({ ...p, vehicleNature: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            >
              <option value="">Sélectionner la nature</option>
              {VEHICLE_NATURES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Technical Specifications */}
      <div>
        <h3 className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider mb-3 pb-1 border-b border-gray-100">
          Caractéristiques techniques
        </h3>
        <p className="text-xs text-gray-400 mb-3">Puissance et capacité du véhicule.</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Puissance fiscale (CV)</label>
            <select
              value={current.fiscalHorsepower || ''}
              onChange={e => setCurrent(p => ({ ...p, fiscalHorsepower: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            >
              <option value="">Sélectionner CV</option>
              {FISCAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Puissance (CH)</label>
            <input
              value={current.horsepower || ''}
              onChange={e => setCurrent(p => ({ ...p, horsepower: e.target.value }))}
              placeholder="150"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de places</label>
            <input
              value={current.seatingCapacity || ''}
              onChange={e => setCurrent(p => ({ ...p, seatingCapacity: e.target.value }))}
              placeholder="5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Charge utile (kg)</label>
            <input
              value={current.payload || ''}
              onChange={e => setCurrent(p => ({ ...p, payload: e.target.value }))}
              placeholder="450"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Poids total autorisé en charge (kg)</label>
            <input
              value={current.grossVehicleWeight || ''}
              onChange={e => setCurrent(p => ({ ...p, grossVehicleWeight: e.target.value }))}
              placeholder="1800"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Registration & Dates */}
      <div>
        <h3 className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider mb-3 pb-1 border-b border-gray-100">
          Immatriculation & Dates
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de 1ère immatriculation</label>
            <DatePicker
              value={current.firstRegistrationDate || ''}
              onChange={v => setCurrent(p => ({ ...p, firstRegistrationDate: v }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de mise en circulation</label>
            <DatePicker
              value={current.licenseIssueDate || ''}
              onChange={v => setCurrent(p => ({ ...p, licenseIssueDate: v }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Âge du véhicule (années)</label>
            <input
              value={current.vehicleAge || ''}
              onChange={e => setCurrent(p => ({ ...p, vehicleAge: e.target.value }))}
              placeholder="3"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            />
          </div>



          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bonus/Malus</label>
            <input
              value={current.bonusMalus || ''}
              onChange={e => setCurrent(p => ({ ...p, bonusMalus: e.target.value }))}
              placeholder="1.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 mt-3 cursor-pointer text-sm text-gray-700">
          <input
            type="checkbox"
            checked={current.isMandatory ?? true}
            onChange={e => setCurrent(p => ({ ...p, isMandatory: e.target.checked }))}
          />
          Souscription d'assurance obligatoire
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button onClick={() => setModalMode(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Annuler</button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-[#E8003D] text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-2 disabled:opacity-60">
          {saving && <Loader2 size={14} className="animate-spin" />}
          {modalMode === 'create' ? 'Enregistrer le vehicule' : 'Mettre a jour'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <p className="text-gray-500 text-sm">Gerez le parc vehicules et leurs possesseurs</p>
        <button
          onClick={() => { setCurrent(emptyVehicle('')); setErrors({}); setModalMode('create') }}
          className="flex items-center gap-2 bg-[#E8003D] text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          <Plus size={18} /> Nouveau vehicule
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher par matricule, VIN, marque..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
          className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tous types</option>
          {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={ownerFilter}
          onChange={e => { setOwnerFilter(e.target.value); setPage(1) }}
          className="w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tous possesseurs</option>
          {users.map(u => <option key={u.id} value={String(u.id)}>{u.firstName} {u.lastName}</option>)}
        </select>
        <button className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm">
          <Filter size={16} /> Filtrer
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-3">{filtered.length} vehicule(s) trouves</p>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                {['Matricule','VIN','Marque / Fabricant','Type','CV Fiscal','Possesseur','Valeur Marche','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(v => {
                const owner = getUserById(v.userId)
                return (
                  <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                    <td className="px-4 py-3 font-medium text-[#1A1A2E]">{v.registrationNumber}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{v.vin ? v.vin.slice(0, 14) + (v.vin.length > 14 ? '…' : '') : '--'}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-medium">{v.make || '--'}</div>
                      <div className="text-xs text-gray-400">{v.manufacturer}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{v.vehicleType || '--'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{v.fiscalHorsepower ? `${v.fiscalHorsepower} CV` : '--'}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {owner ? `${owner.firstName} ${owner.lastName}` : (
                        <span className="text-orange-500 text-xs">ID:{v.userId}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{v.marketValue ? v.marketValue.toLocaleString() + ' DT' : '--'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setCurrent(v); setModalMode('view') }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Voir"><Eye size={16} /></button>
                        <button onClick={() => { setCurrent({ ...v }); setErrors({}); setModalMode('edit') }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Modifier"><Pencil size={16} /></button>
                        <button onClick={() => setDeleteConfirm(v.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Supprimer"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {paginated.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Aucun vehicule trouve</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} sur {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50">Precedent</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50">Suivant</button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalMode === 'create' || modalMode === 'edit'}
        onClose={() => setModalMode(null)}
        title={modalMode === 'create' ? 'Nouveau vehicule' : `Modifier vehicule — ${current.registrationNumber}`}
        size="lg"
      >
        {renderForm()}
      </Modal>

      {/* View Modal — tous les champs */}
      <Modal
        isOpen={modalMode === 'view'}
        onClose={() => setModalMode(null)}
        title={`Vehicule — ${current.registrationNumber}`}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {[
            ['Matricule',            current.registrationNumber],
            ['VIN',                  current.vin || '--'],
            ['Marque',               current.make || '--'],
            ['Fabricant',            current.manufacturer || '--'],
            ['Type',                 current.vehicleType || '--'],
            ['Nature',               current.vehicleNature || '--'],
            ['CV Fiscal',            current.fiscalHorsepower ? `${current.fiscalHorsepower} CV` : '--'],
            ['Puissance (HP)',        current.horsepower ? `${current.horsepower} HP` : '--'],
            ['Nb places',            current.seatingCapacity || '--'],
            ['Charge utile (kg)',     current.payload || '--'],
            ['PTAC (kg)',             current.grossVehicleWeight || '--'],
            ['Age vehicule',          current.vehicleAge ? `${current.vehicleAge} ans` : '--'],
            ['Date 1ère immat.',      current.firstRegistrationDate || '--'],
            ['Date mise en circ.',    current.licenseIssueDate || '--'],
            ['Valeur marchande',      current.marketValue ? `${Number(current.marketValue).toLocaleString()} DT` : '--'],
            ['Prix catalogue',        current.listPrice ? `${Number(current.listPrice).toLocaleString()} DT` : '--'],
            ['Bonus/Malus',           current.bonusMalus || '--'],
            ['Assurance obligatoire', current.isMandatory ? 'Oui' : 'Non'],
            ['Possesseur', (() => {
              const o = current.userId ? getUserById(Number(current.userId)) : null
              return o ? `${o.firstName} ${o.lastName} (${o.identifier})` : 'Sans propriétaire'
            })()],
          ].map(([label, value]) => (
            <div key={label} className="py-2 border-b border-gray-50">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm font-medium text-[#1A1A2E]">{value}</p>
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm !== null && handleDelete(deleteConfirm)}
        title="Supprimer le véhicule ?"
        message="⚠️ Cette action est irréversible. Le véhicule et tous ses devis / contrats associés seront définitivement supprimés."
        confirmLabel="Supprimer"
      />
    </div>
  )
}
