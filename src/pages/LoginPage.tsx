import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, Shield, Loader2 } from 'lucide-react'
import { useAppState } from '@/hooks/useAppState'
import { authApi } from '@/services/api'
import AuthSidebar from '@/components/auth/AuthSidebar'

export default function LoginPage() {
  const { setCurrentPage, setIsAuthenticated, setCurrentUser, setRole, showToast } = useAppState()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!username) errs.username = 'Le username est requis'
    if (!password) errs.password = 'Le mot de passe est requis'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      const res = await authApi.login(username, password)
      const { token, user, role } = res.data

      // ✅ Sauvegarder token + user + role dans localStorage
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('role', role || 'AGENT')

      setCurrentUser(user)
      setRole(role || 'AGENT')
      setIsAuthenticated(true)

      // ✅ Rediriger selon le rôle
      if (role === 'USER') {
        setCurrentPage('user-portal')
      } else {
        setCurrentPage('dashboard')
      }

      showToast(`Bienvenue, ${user.username} !`)
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Identifiants incorrects'
      showToast(msg, 'error')
      setErrors({ password: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white">
      <AuthSidebar />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-2 mb-8 lg:mb-6">
            <Shield size={24} className="text-[#E8003D]" />
            <span className="text-[#E8003D] font-bold text-xl">INSURISE</span>
          </div>

          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-1">Bienvenue !</h2>
          <p className="text-gray-500 mb-8">Connectez-vous a votre espace</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="raed.bennasr"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D] focus:border-transparent"
                />
              </div>
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="********"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D] focus:border-transparent"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-[#E8003D] text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="relative my-6">
            <hr className="border-gray-200" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-sm text-gray-400">ou</span>
          </div>

          <p className="text-center text-sm text-gray-600">
            Pas encore de compte ?{' '}
            <button onClick={() => setCurrentPage('register')} className="text-[#E8003D] font-semibold hover:underline">
              S'inscrire
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
