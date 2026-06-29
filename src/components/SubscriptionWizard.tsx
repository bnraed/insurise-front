import { useState, useEffect } from 'react'
import {
  ChevronRight, ChevronLeft, X, Check, FileText,
  User, FileCheck, CreditCard, Download, Car, Loader2
} from 'lucide-react'
import { contractsApi } from '@/services/api'
import { markDuplicateShown } from '@/utils/duplicateContractGuard'
import type { Quotation, User as UserType } from '@/types'
import { formatDate } from '@/utils/helpers'
import DatePicker from '@/components/ui/DatePicker'

// ─── Types internes ───────────────────────────────────────────────
interface WizardProps {
  quotation:    Quotation
  currentUser:  UserType | null
  getUserById:  (id: number) => UserType | undefined
  vehicle:      any
  pack:         any
  guarantees:   any[]
  onClose:      () => void
  onSuccess:    () => void
  showToast:    (msg: string, type?: string) => void
}

// ─── Stepper ─────────────────────────────────────────────────────
const STEPS = [
  { label: 'Récapitulatif du devis',    icon: FileText   },
  { label: 'Informations personnelles', icon: User       },
  { label: 'Détails du contrat',        icon: FileCheck  },
  { label: 'Livraison',                 icon: Download   },
  { label: 'Paiement',                  icon: CreditCard },
]

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center px-6 py-4 border-b border-gray-100 overflow-x-auto gap-0">
      {STEPS.map((s, i) => {
        const Icon  = s.icon
        const done   = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all text-sm
                ${done   ? 'bg-green-500 border-green-500 text-white'
                : active ? 'bg-[#E8003D] border-[#E8003D] text-white shadow-lg'
                         : 'border-gray-200 text-gray-300 bg-white'}`}>
                {done ? <Check size={15}/> : <Icon size={15}/>}
              </div>
              <span className={`text-[8px] font-semibold uppercase tracking-wide text-center leading-tight max-w-[72px] hidden md:block
                ${active ? 'text-[#E8003D]' : done ? 'text-green-600' : 'text-gray-300'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 ${i < current ? 'bg-green-400' : 'bg-gray-100'}`}/>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── UI helpers ───────────────────────────────────────────────────
const inputCls = `w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm
  focus:outline-none focus:ring-2 focus:ring-[#E8003D]/20 focus:border-[#E8003D]
  disabled:bg-gray-50 disabled:text-gray-400 transition bg-white`

function F({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}{req && <span className="text-[#E8003D] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
function G({ cols = 2, children }: { cols?: number; children: React.ReactNode }) {
  const map: Record<number, string> = { 1: 'grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }
  return <div className={`grid grid-cols-1 ${map[cols] || 'sm:grid-cols-2'} gap-4`}>{children}</div>
}
function Card({ title, color = '#f97316', children }: { title: string; color?: string; children: React.ReactNode }) {
  const bg = color === 'blue' ? 'bg-blue-50/40 border-blue-100' : 'bg-orange-50/40 border-orange-100'
  const tc = color === 'blue' ? 'text-blue-600' : 'text-orange-500'
  return (
    <div className={`border rounded-xl p-5 mb-4 ${bg}`}>
      <h3 className={`text-xs font-bold mb-4 uppercase tracking-widest ${tc}`}>{title}</h3>
      {children}
    </div>
  )
}
function Inp({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className || ''}`} />
}
function Sel({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className || ''}`}>{children}</select>
}
function Radio({ name, value, current, onChange, label }: {
  name: string; value: string; current: string; onChange: (v: string) => void; label: string
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
      <input type="radio" name={name} value={value} checked={current === value}
        onChange={() => onChange(value)} className="accent-[#E8003D]" />
      {label}
    </label>
  )
}

// ─── STEP 0 : Récapitulatif ───────────────────────────────────────
function Step0({ q, vehicle }: { q: Quotation; vehicle: any }) {
  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
        <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0"/>
        <div>
          <p className="text-sm font-semibold text-green-700">Livraison Gratuite</p>
          <p className="text-xs text-green-600 mt-0.5">La livraison est offerte pour toutes les souscriptions.</p>
        </div>
      </div>
      <Card title="Récapitulatif du devis">
        <G cols={3}>
          <F label="N° Devis"><Inp value={q.quoteNumber} disabled/></F>
          <F label="Pack"><Inp value={q.packCode} disabled/></F>
          <F label="Agence"><Inp value={q.agencyCode || '—'} disabled/></F>
          <F label="Date d'effet"><Inp value={formatDate(q.effectiveDate)} disabled/></F>
          <F label="Expiration"><Inp value={formatDate(q.expirationDate)} disabled/></F>
          <F label="Fréquence"><Inp value={q.installmentType} disabled/></F>
          <F label="Renouvellement"><Inp value={q.renewalType} disabled/></F>
          <F label="Prime estimée (DT)">
            <Inp value={q.estimatedPremium?.toFixed(2) || '0.00'} disabled
              className="font-bold text-[#E8003D]"/>
          </F>
          <F label="Statut"><Inp value={q.status} disabled/></F>
        </G>
      </Card>
      {vehicle && (
        <Card title="Véhicule assuré">
          <G cols={3}>
            <F label="Immatriculation"><Inp value={vehicle.registrationNumber || ''} disabled/></F>
            <F label="Marque / Modèle"><Inp value={vehicle.make || ''} disabled/></F>
            <F label="Type"><Inp value={vehicle.vehicleType || ''} disabled/></F>
            <F label="Valeur marché (DT)"><Inp value={vehicle.marketValue || ''} disabled/></F>
            <F label="1ère immat."><Inp value={formatDate(vehicle.firstRegistrationDate)} disabled/></F>
            <F label="VIN"><Inp value={vehicle.vin || ''} disabled/></F>
          </G>
        </Card>
      )}
    </div>
  )
}

// ─── STEP 1 : Informations personnelles ──────────────────────────
interface PersonalForm {
  nationalite: string; nom: string; prenom: string
  dateNaissance: string; lieuNaissance: string; civilite: string
  cinDelvreLe: string; activite: string; statutPro: string
  autreNationalite: string; sourceDesFonds: string
  fonctionPublique: string; familleFonctionPublique: string
  addrMode: string; addrNumRue: string; addrNomRue: string; addrCodePostal: string
  telephone: string; fax: string; email: string
}

function Step1({ f, set }: { f: PersonalForm; set: (k: keyof PersonalForm, v: string) => void }) {
  return (
    <div className="space-y-4">
      <Card title="Informations Personnelles">
        <G cols={3}>
          <F label="Nationalité" req><Inp value={f.nationalite} onChange={e => set('nationalite', e.target.value)} placeholder="TN"/></F>
          <F label="Nom" req><Inp value={f.nom} onChange={e => set('nom', e.target.value)}/></F>
          <F label="Prénom" req><Inp value={f.prenom} onChange={e => set('prenom', e.target.value)}/></F>
          <F label="Date de naissance"><DatePicker value={f.dateNaissance} onChange={v => set('dateNaissance', v)} className={inputCls}/></F>
          <F label="Lieu de Naissance" req><Inp value={f.lieuNaissance} onChange={e => set('lieuNaissance', e.target.value)}/></F>
          <F label="Civilité" req>
            <Sel value={f.civilite} onChange={e => set('civilite', e.target.value)}>
              <option value="">Sélectionner</option>
              <option value="M.">M.</option>
              <option value="Mme">Mme</option>
              <option value="Mlle">Mlle</option>
            </Sel>
          </F>
          <F label="CIN Délivré Le"><DatePicker value={f.cinDelvreLe} onChange={v => set('cinDelvreLe', v)} className={inputCls}/></F>
          <F label="Activité" req><Inp value={f.activite} onChange={e => set('activite', e.target.value)} placeholder="Ingénieur"/></F>
          <F label="Statut Professionnel" req>
            <Sel value={f.statutPro} onChange={e => set('statutPro', e.target.value)}>
              <option value="">Sélectionner</option>
              <option value="Employed">Salarié</option>
              <option value="Self-Employed">Indépendant</option>
              <option value="Profession Libérale">Profession Libérale</option>
              <option value="Retired">Retraité</option>
              <option value="Student">Étudiant</option>
            </Sel>
          </F>
        </G>
        <G cols={2}>
          <F label="Autre Nationalité"><Inp value={f.autreNationalite} onChange={e => set('autreNationalite', e.target.value)} placeholder="Autre Nationalité"/></F>
          <F label="Source des Fonds" req>
            <Sel value={f.sourceDesFonds} onChange={e => set('sourceDesFonds', e.target.value)}>
              <option value="">Sélectionner</option>
              <option value="Savings">Épargne</option>
              <option value="Salary">Salaire</option>
              <option value="Inheritance">Héritage</option>
              <option value="Business income">Revenus d'entreprise</option>
              <option value="Revenu d'une activité secondaire">Revenu d'une activité secondaire</option>
            </Sel>
          </F>
        </G>
      </Card>

      <Card title="Questions sur les Organisations Politiques" color="blue">
        <div className="space-y-4">
          <F label="Occupez-vous une fonction publique ?" req>
            <div className="flex gap-6 mt-1">
              <Radio name="fp"  value="yes" current={f.fonctionPublique}       onChange={v => set('fonctionPublique', v)}       label="Oui"/>
              <Radio name="fp"  value="no"  current={f.fonctionPublique}       onChange={v => set('fonctionPublique', v)}       label="Non"/>
            </div>
          </F>
          <F label="Un membre de la famille occupe-t-il une fonction publique ?" req>
            <div className="flex gap-6 mt-1">
              <Radio name="ffp" value="yes" current={f.familleFonctionPublique} onChange={v => set('familleFonctionPublique', v)} label="Oui"/>
              <Radio name="ffp" value="no"  current={f.familleFonctionPublique} onChange={v => set('familleFonctionPublique', v)} label="Non"/>
            </div>
          </F>
        </div>
      </Card>

      <Card title="Coordonnées et Adresse" color="blue">
        <F label="Mode d'adresse">
          <div className="flex gap-6 mt-1 mb-4">
            <Radio name="addrMode" value="new"      current={f.addrMode} onChange={v => set('addrMode', v)} label="Entrer une Nouvelle Adresse"/>
            <Radio name="addrMode" value="existing" current={f.addrMode} onChange={v => set('addrMode', v)} label="Utiliser Mes Adresses"/>
          </div>
        </F>
        <G cols={3}>
          <F label="N° de Rue" req><Inp type="number" value={f.addrNumRue} onChange={e => set('addrNumRue', e.target.value)} placeholder="12"/></F>
          <F label="Nom de Rue" req><Inp value={f.addrNomRue} onChange={e => set('addrNomRue', e.target.value)} placeholder="Rue de la Paix"/></F>
          <F label="Code Postal" req><Inp value={f.addrCodePostal} onChange={e => set('addrCodePostal', e.target.value)} placeholder="5000"/></F>
        </G>
        <div className="mt-4 pt-4 border-t border-blue-100">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Informations de Contact</p>
          <G cols={3}>
            <F label="Numéro de téléphone" req><Inp value={f.telephone} onChange={e => set('telephone', e.target.value)} placeholder="5X XXX XXX"/></F>
            <F label="Fax"><Inp value={f.fax} onChange={e => set('fax', e.target.value)} placeholder="Fax"/></F>
            <F label="Email" req><Inp type="email" value={f.email} onChange={e => set('email', e.target.value)}/></F>
          </G>
        </div>
      </Card>
    </div>
  )
}

// ─── STEP 2 : Détails du contrat ──────────────────────────────────
interface ContractForm {
  fractionnement: string; renouvellement: string
  dateEffet: string; echeance: string
  permisNumero: string; permisDelvreLe: string; permisPays: string; permisLieu: string
  etatCivil: string; personnesSousToit: string
  transportMatDang: string; usageVehicule: string
  vehiculeFinanceCredit: boolean; nomOrganisation: string; dateFinTranscription: string
}

function Step2({ f, set }: { f: ContractForm; set: (k: keyof ContractForm, v: string | boolean) => void }) {
  const computeEcheance = (d: string) => {
    if (!d) return ''
    const dt = new Date(d)
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`
  }
  return (
    <div className="space-y-4">
      <Card title="Informations de Base du Contrat">
        <G cols={2}>
          <F label="Fractionnement" req>
            <Sel value={f.fractionnement} onChange={e => set('fractionnement', e.target.value)}>
              <option value="ANNUAL">Annuel</option>
              <option value="SEMI_ANNUAL">Semestriel</option>
              <option value="QUARTERLY">Trimestriel</option>
              <option value="MONTHLY">Mensuel</option>
            </Sel>
          </F>
          <F label="Renouvellement" req>
            <Sel value={f.renouvellement} onChange={e => set('renouvellement', e.target.value)}>
              <option value="AUTOMATIC">Renouvellement Annuel</option>
              <option value="MANUAL">Manuel</option>
            </Sel>
          </F>
          <F label="Date d'Effet" req>
            <DatePicker value={f.dateEffet} onChange={v => { set('dateEffet', v); set('echeance', computeEcheance(v)) }} className={inputCls}/>
          </F>
          <F label="Échéance du Contrat">
            <Inp value={f.echeance || computeEcheance(f.dateEffet)} disabled className="bg-gray-50"/>
          </F>
        </G>
      </Card>

      <Card title="Permis de Conduire">
        <G cols={2}>
          <F label="Numéro de Permis de Conduire" req><Inp value={f.permisNumero} onChange={e => set('permisNumero', e.target.value)} placeholder="12333"/></F>
          <F label="Délivré Le" req><DatePicker value={f.permisDelvreLe} onChange={v => set('permisDelvreLe', v)} className={inputCls}/></F>
          <F label="Pays" req><Inp value={f.permisPays} onChange={e => set('permisPays', e.target.value)} placeholder="tunisie"/></F>
          <F label="Lieu de Délivrance" req><Inp value={f.permisLieu} onChange={e => set('permisLieu', e.target.value)} placeholder="sousse"/></F>
        </G>
      </Card>

      <Card title="Situation Familiale">
        <G cols={2}>
          <F label="État Civil" req>
            <Sel value={f.etatCivil} onChange={e => set('etatCivil', e.target.value)}>
              <option value="">Sélectionner</option>
              <option value="Single">Célibataire</option>
              <option value="Married">Marié(e)</option>
              <option value="Divorced">Divorcé(e)</option>
              <option value="Widowed">Veuf/Veuve</option>
            </Sel>
          </F>
          <F label="Personnes Vivant Sous le Même Toit" req>
            <Inp type="number" min="0" value={f.personnesSousToit} onChange={e => set('personnesSousToit', e.target.value)}/>
          </F>
        </G>
      </Card>

      <Card title="Usage du Véhicule">
        <div className="mb-4">
          <F label="Transport de Matières Dangereuses" req>
            <div className="flex gap-6 mt-1">
              <Radio name="tmd" value="Oui" current={f.transportMatDang} onChange={v => set('transportMatDang', v)} label="Oui"/>
              <Radio name="tmd" value="Non" current={f.transportMatDang} onChange={v => set('transportMatDang', v)} label="Non"/>
            </div>
          </F>
        </div>
        <F label="Usage du Véhicule" req>
          <Sel value={f.usageVehicule} onChange={e => set('usageVehicule', e.target.value)}>
            <option value="">Sélectionner</option>
            <option value="Private use">Usage Privé</option>
            <option value="Business use">Usage Professionnel</option>
            <option value="Commercial use">Usage Commercial</option>
          </Sel>
        </F>
        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={f.vehiculeFinanceCredit}
              onChange={e => set('vehiculeFinanceCredit', e.target.checked)}
              className="accent-[#E8003D] w-4 h-4"/>
            <span className="text-sm text-gray-700">Véhicule Financé par Crédit</span>
          </label>
        </div>
        {f.vehiculeFinanceCredit && (
          <G cols={2}>
            <F label="Nom de l'Organisation"><Inp value={f.nomOrganisation} onChange={e => set('nomOrganisation', e.target.value)}/></F>
            <F label="Date de Fin de Transcription"><DatePicker value={f.dateFinTranscription} onChange={v => set('dateFinTranscription', v)} className={inputCls}/></F>
          </G>
        )}
      </Card>
    </div>
  )
}

// ─── STEP 3 : Livraison ───────────────────────────────────────────
interface DeliveryForm {
  addrMode: string; addrNumRue: string; addrNomRue: string; addrCodePostal: string
}

function Step3({ f, set, personalAddr }: {
  f: DeliveryForm
  set: (k: keyof DeliveryForm, v: string) => void
  personalAddr: { numRue: string; nomRue: string; codePostal: string }
}) {
  const displayAddr = `${personalAddr.numRue} ${personalAddr.nomRue}, ${personalAddr.codePostal}`.trim()
  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
        <Check size={16} className="text-green-600 flex-shrink-0"/>
        <div>
          <p className="text-sm font-semibold text-green-700">Livraison Gratuite</p>
          <p className="text-xs text-green-600 mt-0.5">La livraison est offerte pour toutes les souscriptions.</p>
        </div>
      </div>

      <Card title="Adresse de Livraison">
        <F label="Mode d'Adresse de Livraison">
          <div className="flex flex-wrap gap-6 mt-1 mb-4">
            <Radio name="delivMode" value="existing" current={f.addrMode} onChange={v => set('addrMode', v)} label="Utiliser Mes Adresses"/>
            <Radio name="delivMode" value="new"      current={f.addrMode} onChange={v => set('addrMode', v)} label="Entrer une Nouvelle Adresse"/>
            <Radio name="delivMode" value="agency"   current={f.addrMode} onChange={v => set('addrMode', v)} label="Adresse de l'Agence"/>
          </div>
        </F>

        {f.addrMode === 'existing' ? (
          <F label="Sélectionner l'Adresse de Livraison">
            <Sel value="0" onChange={() => {}}>
              <option value="0">{displayAddr || 'Aucune adresse disponible'}</option>
            </Sel>
          </F>
        ) : (
          <G cols={3}>
            <F label="N° de Rue" req><Inp type="number" value={f.addrNumRue} onChange={e => set('addrNumRue', e.target.value)} placeholder="12"/></F>
            <F label="Nom de Rue" req><Inp value={f.addrNomRue} onChange={e => set('addrNomRue', e.target.value)}/></F>
            <F label="Code Postal" req><Inp value={f.addrCodePostal} onChange={e => set('addrCodePostal', e.target.value)}/></F>
          </G>
        )}
      </Card>
    </div>
  )
}

// ─── STEP 4 : Paiement ───────────────────────────────────────────
interface PaymentForm {
  method: 'CARD' | 'BANK_TRANSFER' | 'CHEQUE'
  // Carte
  cardNumber: string; cardHolder: string; expiry: string; cvv: string
  // Virement
  rib: string; bankName: string
  // Chèque
  chequeNumber: string; chequeBank: string
}

function Step4Payment({ f, set, totalAmount }: {
  f: PaymentForm
  set: (k: keyof PaymentForm, v: string) => void
  totalAmount: number
}) {
  const methodBtn = (val: PaymentForm['method'], label: string, icon: string) => (
    <button type="button"
      onClick={() => set('method', val)}
      className={`flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition text-sm font-medium
        ${f.method === val
          ? 'border-[#E8003D] bg-red-50 text-[#E8003D]'
          : 'border-gray-100 bg-white text-gray-500 hover:border-gray-300'}`}>
      <span className="text-2xl">{icon}</span>
      {label}
    </button>
  )

  return (
    <div className="space-y-5">
      {/* Montant récapitulatif */}
      <div className="bg-[#1E3A5F] rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-blue-200 uppercase tracking-widest">Montant à payer</p>
          <p className="text-3xl font-bold text-white mt-1">{totalAmount.toFixed(2)} <span className="text-lg">DT</span></p>
        </div>
        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
          <CreditCard size={24} className="text-white"/>
        </div>
      </div>

      {/* Choix méthode */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Méthode de paiement</p>
        <div className="flex gap-3">
          {methodBtn('CARD',          'Carte bancaire', '💳')}
          {methodBtn('BANK_TRANSFER', 'Virement',       '🏦')}
          {methodBtn('CHEQUE',        'Chèque',         '📝')}
        </div>
      </div>

      {/* Formulaire carte */}
      {f.method === 'CARD' && (
        <Card title="Informations de la carte">
          <div className="space-y-4">
            <F label="Numéro de carte" req>
              <Inp value={f.cardNumber}
                onChange={e => set('cardNumber', e.target.value.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim())}
                placeholder="0000 0000 0000 0000" maxLength={19}
                className="font-mono tracking-widest"/>
            </F>
            <F label="Titulaire de la carte" req>
              <Inp value={f.cardHolder}
                onChange={e => set('cardHolder', e.target.value.toUpperCase())}
                placeholder="NOM PRENOM"/>
            </F>
            <G cols={2}>
              <F label="Date d'expiration" req>
                <Inp value={f.expiry}
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g,'').slice(0,4)
                    if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2)
                    set('expiry', v)
                  }}
                  placeholder="MM/AA" maxLength={5}/>
              </F>
              <F label="CVV" req>
                <Inp value={f.cvv}
                  onChange={e => set('cvv', e.target.value.replace(/\D/g,'').slice(0,4))}
                  placeholder="***" maxLength={4} type="password"/>
              </F>
            </G>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
            <span>🔒</span>
            <span>Paiement sécurisé — vos données sont chiffrées SSL</span>
          </div>
        </Card>
      )}

      {/* Formulaire virement */}
      {f.method === 'BANK_TRANSFER' && (
        <Card title="Informations de virement" color="blue">
          <G cols={2}>
            <F label="RIB / IBAN" req>
              <Inp value={f.rib} onChange={e => set('rib', e.target.value)} placeholder="TN59 XXXX XXXX XXXX"/>
            </F>
            <F label="Banque" req>
              <Inp value={f.bankName} onChange={e => set('bankName', e.target.value)} placeholder="STB, BNA, Attijari..."/>
            </F>
          </G>
          <div className="mt-4 bg-blue-50 rounded-lg p-3 text-xs text-blue-600">
            <p className="font-semibold mb-1">Coordonnées bancaires Insurise :</p>
            <p>RIB : <span className="font-mono">TN59 1234 5678 9012 3456 7890</span></p>
            <p>Référence : <span className="font-mono">{Math.random().toString(36).slice(2,10).toUpperCase()}</span></p>
          </div>
        </Card>
      )}

      {/* Formulaire chèque */}
      {f.method === 'CHEQUE' && (
        <Card title="Informations du chèque" color="blue">
          <G cols={2}>
            <F label="Numéro de chèque" req>
              <Inp value={f.chequeNumber} onChange={e => set('chequeNumber', e.target.value)} placeholder="XXXXXXXX"/>
            </F>
            <F label="Banque émettrice" req>
              <Inp value={f.chequeBank} onChange={e => set('chequeBank', e.target.value)} placeholder="STB, BNA..."/>
            </F>
          </G>
          <p className="mt-3 text-xs text-gray-500">
            Le chèque doit être libellé à l'ordre de <strong>Insurise Assurance</strong> et déposé à votre agence.
          </p>
        </Card>
      )}
    </div>
  )
}

// ─── STEP 5 : Confirmation ────────────────────────────────────────
function Step5({ contractNumber, paymentMethod }: { contractNumber: string; paymentMethod: string }) {
  const methodLabel: Record<string, string> = {
    CARD:          'Carte bancaire',
    BANK_TRANSFER: 'Virement bancaire',
    CHEQUE:        'Chèque',
  }
  return (
    <div className="space-y-4 text-center py-4">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <Check size={36} className="text-green-600"/>
      </div>
      <h3 className="text-xl font-bold text-[#1E3A5F]">Contrat émis avec succès !</h3>
      <p className="text-sm text-gray-500">N° de contrat : <strong className="text-[#1E3A5F]">{contractNumber}</strong></p>

      <div className="max-w-md mx-auto space-y-3 text-left">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0"/>
          <div>
            <p className="text-sm font-semibold text-green-700">Paiement enregistré</p>
            <p className="text-xs text-green-600 mt-0.5">{methodLabel[paymentMethod] || paymentMethod}</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <Download size={16} className="text-blue-600 mt-0.5 flex-shrink-0"/>
          <div>
            <p className="text-sm font-semibold text-blue-700">Documents disponibles</p>
            <p className="text-xs text-blue-500 mt-0.5">Téléchargez vos documents depuis l'onglet Contrats.</p>
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 text-center">Un email de confirmation a été envoyé à votre adresse.</p>
        </div>
      </div>
    </div>
  )
}

// ─── WIZARD PRINCIPAL ────────────────────────────────────────────
export default function SubscriptionWizard({
  quotation, currentUser, getUserById, vehicle, pack, guarantees, onClose, onSuccess, showToast
}: WizardProps) {
  // ── Utilisateur du devis (peut différer de currentUser connecté) ──
  const quotationUser = getUserById(quotation.userId) ?? currentUser
  const [step, setStep]   = useState(0)
  const [saving, setSaving] = useState(false)
  const [createdContractNumber, setCreatedContractNumber] = useState('')

  // ── Formulaires ─────────────────────────────────────────────
  // ── Pré-remplissage depuis l'utilisateur du devis ───────────────
  const qUser    = quotationUser as any
  const userAddr = qUser?.addresses?.[0] as { numRue: number; nomRue: string; codePostal: string } | undefined
  const userPhone= qUser?.phones?.[0]    as { numeroTelephone: string } | undefined

  // Adresse dénormalisée depuis le devis (si présente)
  const devisAddr = quotation.addrNomRue ? {
    numRue:    quotation.addrNumRue    || 0,
    nomRue:    quotation.addrNomRue    || '',
    codePostal:quotation.addrCodePostal || '',
  } : undefined

  const resolvedAddr = devisAddr ?? userAddr

  const [personal, setPersonal] = useState<PersonalForm>({
    // Identité — depuis l'utilisateur sélectionné dans le devis
    nationalite:             qUser?.nationality        || 'TN',
    nom:                     quotationUser?.lastName   || '',
    prenom:                  quotationUser?.firstName  || '',
    dateNaissance:           qUser?.birthDate          || '',
    lieuNaissance:           qUser?.placeOfBirth       || '',
    civilite:                qUser?.civility            || '',
    cinDelvreLe:             qUser?.cinIssuedOn         || '',
    activite:                qUser?.activity            || '',
    statutPro:               qUser?.professionalStatus  || '',
    autreNationalite:        qUser?.otherNationality    || '',
    sourceDesFonds:          qUser?.sourceOfFunds       || '',
    fonctionPublique:        qUser?.hasPublicFunction   ? 'yes' : 'no',
    familleFonctionPublique: qUser?.hasFamilyPublicFunction ? 'yes' : 'no',
    // Adresse — depuis le devis en priorité, sinon depuis le profil user
    addrMode:      resolvedAddr ? 'existing' : 'new',
    addrNumRue:    resolvedAddr ? String(resolvedAddr.numRue  || '') : '',
    addrNomRue:    resolvedAddr?.nomRue      || '',
    addrCodePostal:resolvedAddr?.codePostal  || '',
    // Contact
    telephone:     userPhone?.numeroTelephone || quotationUser?.phone || '',
    fax:           '',
    email:         quotationUser?.email || '',
  })

  const [contract, setContract] = useState<ContractForm>({
    fractionnement:        quotation.installmentType || 'ANNUAL',
    renouvellement:        quotation.renewalType     || 'AUTOMATIC',
    dateEffet:             quotation.effectiveDate   || '',
    echeance:              '',
    permisNumero:          '',
    permisDelvreLe:        '',
    permisPays:            '',
    permisLieu:            '',
    etatCivil:             '',
    personnesSousToit:     '',
    transportMatDang:      'Non',
    usageVehicule:         '',
    vehiculeFinanceCredit: false,
    nomOrganisation:       '',
    dateFinTranscription:  '',
  })

  const [delivery, setDelivery] = useState<DeliveryForm>({
    addrMode:    'existing',
    addrNumRue:  '',
    addrNomRue:  '',
    addrCodePostal: '',
  })

  const [payment, setPayment] = useState<PaymentForm>({
    method:       'CARD',
    cardNumber:   '',
    cardHolder:   '',
    expiry:       '',
    cvv:          '',
    rib:          '',
    bankName:     '',
    chequeNumber: '',
    chequeBank:   '',
  })

  function setP(k: keyof PersonalForm,  v: string) { setPersonal(p => ({ ...p, [k]: v })) }
  function setC(k: keyof ContractForm,  v: string | boolean) { setContract(p => ({ ...p, [k]: v })) }
  function setD(k: keyof DeliveryForm,  v: string) { setDelivery(p => ({ ...p, [k]: v })) }
  function setPay(k: keyof PaymentForm, v: string) { setPayment(p => ({ ...p, [k]: v })) }

  // Adresse de livraison effective
  const deliveryAddr = delivery.addrMode === 'existing'
    ? { numRue: Number(personal.addrNumRue) || 0, nomRue: personal.addrNomRue, codePostal: personal.addrCodePostal }
    : { numRue: Number(delivery.addrNumRue) || 0, nomRue: delivery.addrNomRue, codePostal: delivery.addrCodePostal }

  // ── Construction du payload ──────────────────────────────────
  const buildPayload = () => {
    const mv = Number(vehicle?.marketValue) || 0
    const cv = Number(vehicle?.listPrice)   || 0
    const fpRaw = vehicle?.fiscalHorsepower?.replace(' CV', '') || ''
    const splitMap: Record<string, string> = {
      ANNUAL: 'ANNUAL', SEMI_ANNUAL: 'SEMESTER', QUARTERLY: 'QUARTERLY', MONTHLY: 'MONTHLY',
    }

    const packCodes = pack?.guarantees || []
    const packGuarantees = guarantees
      .filter(g => packCodes.includes(g.codeGarantie))
      .map((g, i) => ({
        id: g.id, guaranteeCode: g.codeGarantie, guaranteeLabel: g.libelleGarantie,
        insuredCapital: g.capitalAssure || '', deductible: g.franchise || '',
        rate: g.taux || '0', type: 'pack', displayOrder: i + 1,
      }))
    const optGuarantees = guarantees
      .filter(g => (quotation.coverages || []).includes(g.id) && g.type === 'OPTIONAL')
      .map((g, i) => ({
        id: g.id, guaranteeCode: g.codeGarantie, guaranteeLabel: g.libelleGarantie,
        insuredCapital: g.capitalAssure || '', deductible: g.franchise || '',
        rate: g.taux || '0', type: 'optionnelle', displayOrder: i + 1,
      }))

    return {
      carAge: 0,
      contract: {
        effectiveDate:    contract.dateEffet ? new Date(contract.dateEffet).toISOString() : undefined,
        contractMaturity: contract.echeance,
      },
      personalData: {
        placeOfBirth:           personal.lieuNaissance,
        otherNationality:       personal.autreNationalite,
        cinIssuedOn:            personal.cinDelvreLe,
        professionalStatus:     personal.statutPro,
        sourceOfFunds:          personal.sourceDesFonds,
        hasPublicFunction:      personal.fonctionPublique === 'yes',
        hasFamilyPublicFunction:personal.familleFonctionPublique === 'yes',
      },
      drivingLicense: {
        drivingLicenseNumber: contract.permisNumero,
        country:              contract.permisPays,
        issuedOn:             contract.permisDelvreLe ? new Date(contract.permisDelvreLe).toISOString() : undefined,
        issuanceLocation:     contract.permisLieu,
      },
      familySituation: {
        familyStatus:                       contract.etatCivil,
        numberOfPeopleLivingUnderSameRoof:  contract.personnesSousToit,
      },
      vehicleUsageData: {
        vehicleUsage:               contract.usageVehicule,
        transportOfHazardousMaterials: contract.transportMatDang,
        vehicleFinancedByCredit:    contract.vehiculeFinanceCredit,
        nameOfOrganization:         contract.nomOrganisation,
        dateOfEndTranscription:     contract.dateFinTranscription,
      },
      userDetails: {
        lastName:    personal.nom,
        firstName:   personal.prenom,
        birthDate:   personal.dateNaissance,
        activity:    personal.activite,
        blacklisted: false,
        email:       personal.email,
        nationality: personal.nationalite,
        identifier:  currentUser?.identifier || currentUser?.username || '',
        addresses: [{
          numRue:           Number(personal.addrNumRue) || 0,
          nomRue:           personal.addrNomRue,
          codePostal:       personal.addrCodePostal,
          contactParDefaut: true,
        }],
        phones: [{
          numeroTelephone: personal.telephone,
          typeTelephone:   '',
          contactParDefaut: true,
        }],
      },
      quotationId:  quotation.quoteNumber,  // ContractService.findByQuoteNumber()
      productType:  'AUTO',
      // ── Champs contrat complets ──────────────────────────────
      quotationNumber: quotation.quoteNumber,
      agencyCode:   quotation.agencyCode,
      userAddress:  {
        numRue:           deliveryAddr.numRue,
        nomRue:           deliveryAddr.nomRue,
        codePostal:       deliveryAddr.codePostal,
        contactParDefaut: true,
      },
      contractDetails: {
        productType:       'AUTO',
        contractGenerated: 'false',
        contractNature:    contract.renouvellement === 'AUTOMATIC' ? 'RENEWABLE' : 'MANUAL',
        contractSplitType: splitMap[contract.fractionnement] || 'ANNUAL',
      },
      paymentDetails: {
        totalAmount: String(quotation.totalAmount ?? quotation.estimatedPremium ?? 0),
        feeAmount:   String(quotation.feeAmount ?? 0),
        netAmount:   String(quotation.netAmount ?? quotation.estimatedPremium ?? 0),
      },
      vehicleProfile: vehicle ? {
        registrationNumber:           vehicle.registrationNumber || '',
        brand:                        vehicle.make || '',
        model:                        vehicle.make || '',
        year:                         vehicle.firstRegistrationDate
                                        ? new Date(vehicle.firstRegistrationDate).getFullYear().toString()
                                        : '',
        power:                        vehicle.horsepower || '',
        usefulLoad:                   vehicle.payload ? vehicle.payload + 'kg' : '',
        totalWeight:                  vehicle.grossVehicleWeight ? vehicle.grossVehicleWeight + 'kg' : '',
        numberOfSeats:                Number(vehicle.seatingCapacity) || 5,
        firstRegistrationDate:        vehicle.firstRegistrationDate || '',
        vehicleType:                  vehicle.vehicleType || '',
        vehicleNature:                vehicle.vehicleNature || '',
        marketValue:                  mv,
        serialNumber:                 vehicle.vin || '',
        vin:                          vehicle.vin || '',
        bonusMalus:                   vehicle.bonusMalus || '1.00',
        mandatorySubscriptionIndicator: true,
        manufacturer:                 vehicle.manufacturer || '',
        fiscalPower:                  Number(fpRaw) || 0,
        catalogValue:                 cv,
        replacementValue:             cv,
        vehicleAge:                   0,
        horsepower:                   Number(vehicle.horsepower) || 0,
        drivingLicenseIssueDate:      contract.permisDelvreLe || '',
      } : undefined,
      guarantees:         packGuarantees,
      optionalGuarantees: optGuarantees,
      pack: { packCode: quotation.packCode },
    }
  }

  // ── Soumission finale (step 3 → 4) ──────────────────────────
  const handleSubmit = async () => {
    setSaving(true)
    try {
      const payload = buildPayload()
      console.log('[Wizard] Payload envoyé:', JSON.stringify(payload, null, 2))
      const res = await contractsApi.create(payload)
      setCreatedContractNumber(res.data?.contractNumber || '')
      setStep(5)
      showToast(`Contrat ${res.data?.contractNumber} émis avec succès !`)
      onSuccess()
    } catch (e: any) {
      const raw = e.response?.data?.message || e.response?.data?.error || ''
      const isDuplicate =
        raw === 'Ce véhicule a déjà un contrat actif' ||
        raw.includes('uq_contracts_vehicle_active') ||
        raw.includes('duplicate key value violates unique constraint')
      const errMsg = isDuplicate ? 'Ce véhicule a déjà un contrat actif' : raw || 'Erreur création contrat'
      if (isDuplicate) markDuplicateShown()
      showToast(errMsg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const canNext = () => {
    if (step === 1) return !!(personal.nom && personal.prenom && personal.nationalite && personal.telephone && personal.email && personal.addrNomRue && personal.addrCodePostal)
    if (step === 2) return !!(contract.dateEffet && contract.permisNumero && contract.permisPays && contract.permisLieu && contract.etatCivil && contract.usageVehicule)
    if (step === 4) {
      if (payment.method === 'CARD')          return !!(payment.cardNumber && payment.cardHolder && payment.expiry && payment.cvv)
      if (payment.method === 'BANK_TRANSFER') return !!(payment.rib && payment.bankName)
      if (payment.method === 'CHEQUE')        return !!(payment.chequeNumber && payment.chequeBank)
    }
    return true
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-[#1E3A5F]">Souscription en ligne</h2>
            <p className="text-xs text-gray-400">Devis {quotation.quoteNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-600">
            <X size={18}/>
          </button>
        </div>

        {/* Stepper */}
        <StepBar current={step}/>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 0 && <Step0 q={quotation} vehicle={vehicle}/>}
          {step === 1 && <Step1 f={personal} set={setP}/>}
          {step === 2 && <Step2 f={contract} set={setC}/>}
          {step === 3 && (
            <Step3 f={delivery} set={setD}
              personalAddr={{ numRue: personal.addrNumRue, nomRue: personal.addrNomRue, codePostal: personal.addrCodePostal }}/>
          )}
          {step === 4 && (
            <Step4Payment f={payment} set={setPay}
              totalAmount={quotation.totalAmount ?? quotation.estimatedPremium ?? 0}/>
          )}
          {step === 5 && <Step5 contractNumber={createdContractNumber} paymentMethod={payment.method}/>}
        </div>

        {/* Footer */}
        {step < 5 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition">
              <ChevronLeft size={16}/>
              {step === 0 ? 'Annuler' : 'Précédent'}
            </button>

            <div className="flex items-center gap-3">
              {step < 4 && (
                <button onClick={onClose}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition">
                  Annuler
                </button>
              )}
              {step < 4 ? (
                <button onClick={() => setStep(s => s + 1)}
                  disabled={!canNext()}
                  className="flex items-center gap-2 px-6 py-2 bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg text-sm font-medium transition disabled:opacity-40">
                  Suivant <ChevronRight size={16}/>
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-[#E8003D] hover:bg-[#c5002f] text-white rounded-lg text-sm font-medium transition disabled:opacity-60">
                  {saving ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                  {saving ? 'Paiement en cours...' : 'Payer et créer le contrat'}
                </button>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex justify-center px-6 py-4 border-t border-gray-100">
            <button onClick={onClose}
              className="px-8 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#162d4a] transition">
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
