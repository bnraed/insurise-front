import { useState } from 'react'
import { Shield, Loader2 } from 'lucide-react'
import { useAppState } from '@/hooks/useAppState'
import { authApi } from '@/services/api'
import AuthSidebar from '@/components/auth/AuthSidebar'

export default function RegisterPage() {
  const { setCurrentPage, showToast } = useAppState()
  const [form, setForm] = useState({
    firstName: '', lastName: '', identifier: '', username: '',
    email: '', phone: '', type: 'physique', agencyId: '1',
    password: '', confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const update = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  const getPasswordStrength = () => {
    const len = form.password.length
    if (len === 0) return { label: '', color: 'bg-gray-200', width: 'w-0' }
    if (len < 6)  return { label: 'Faible', color: 'bg-red-500', width: 'w-1/3' }
    if (len < 10) return { label: 'Moyen', color: 'bg-yellow-500', width: 'w-2/3' }
    return { label: 'Fort', color: 'bg-green-500', width: 'w-full' }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.firstName)  errs.firstName = 'Le prenom est requis'
    if (!form.lastName)   errs.lastName  = 'Le nom est requis'
    if (!form.identifier) errs.identifier = 'Le National ID est requis'
    if (!form.username)   errs.username  = 'Le username est requis'
    if (!form.email)      errs.email     = "L'email est requis"
    if (!form.password)   errs.password  = 'Le mot de passe est requis'
    if (form.password !== form.confirmPassword)
      errs.confirmPassword = 'Les mots de passe ne correspondent pas'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      await authApi.register({
        username:   form.username,
        email:      form.email,
        password:   form.password,
        firstName:  form.firstName,
        lastName:   form.lastName,
        phone:      form.phone,
        identifier: form.identifier,
        agencyId:   Number(form.agencyId) || 1,
      })
      showToast('Compte cree avec succes ! Connectez-vous.', 'success')
      setCurrentPage('login')
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erreur lors de la creation du compte'
      showToast(msg, 'error')
      if (msg.toLowerCase().includes('username')) setErrors({ username: msg })
      if (msg.toLowerCase().includes('email'))    setErrors({ email: msg })
    } finally {
      setLoading(false)
    }
  }

  const strength = getPasswordStrength()

  return (
    <div className="min-h-screen flex bg-white">
      <AuthSidebar />
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="max-w-lg w-full">
          <div className="flex items-center gap-2 mb-6">
            <Shield size={24} className="text-[#E8003D]" />
            <span className="text-[#E8003D] font-bold text-xl">INSURISE</span>
          </div>
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-1">Creer un compte agent</h2>
          <p className="text-gray-500 mb-6">Remplissez les informations ci-dessous</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-[#1E3A5F] uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">
                Informations personnelles
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'firstName', label: 'Prenom *', placeholder: 'John' },
                  { key: 'lastName',  label: 'Nom *',    placeholder: 'Doe' },
                  { key: 'identifier',label: 'National ID *', placeholder: 'AB123456' },
                  { key: 'username',  label: 'Username *', placeholder: 'johndoe' },
                  { key: 'email',     label: 'Email *',   placeholder: 'john@mail.com' },
                  { key: 'phone',     label: 'Telephone', placeholder: '+216 600 000 000' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input value={(form as any)[key]} onChange={(e) => update(key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]" />
                    {(errors as any)[key] && <p className="text-red-500 text-xs mt-1">{(errors as any)[key]}</p>}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de compte</label>
                <div className="flex gap-6">
                  {['physique', 'morale'].map((t) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input type="radio" name="type" value={t} checked={form.type === t} onChange={(e) => update('type', e.target.value)} className="text-[#E8003D]" />
                      {t === 'physique' ? 'Personne physique' : 'Personne morale'}
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Agency ID</label>
                <input value={form.agencyId} onChange={(e) => update('agencyId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#1E3A5F] uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">
                Securite
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                  <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)}
                    placeholder="********" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]" />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer *</label>
                  <input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)}
                    placeholder="********" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]" />
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} ${strength.width} transition-all duration-300 rounded-full`} />
                  </div>
                  <p className={`text-xs mt-1 ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setCurrentPage('login')}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 text-sm">
                Annuler
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 bg-[#E8003D] text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Creation...' : 'Creer mon compte'}
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-600 mt-4">
            Deja un compte ?{' '}
            <button onClick={() => setCurrentPage('login')} className="text-[#E8003D] font-semibold hover:underline">
              Se connecter
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
