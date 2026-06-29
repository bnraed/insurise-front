import { Shield, CheckCircle } from 'lucide-react'

export default function AuthSidebar() {
  return (
    <div className="hidden lg:flex lg:w-[40%] bg-gradient-to-br from-[#1E3A5F] to-[#2d5a9e] flex-col items-center justify-center p-12 text-white relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-10 left-10 w-32 h-32 border border-white/10 rounded-full" />
      <div className="absolute bottom-20 right-10 w-48 h-48 border border-white/10 rounded-full" />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-[#E8003D] rounded-xl flex items-center justify-center">
          <Shield size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          INSUR<span className="text-[#E8003D]">ISE</span>
        </h1>
      </div>

      <p className="text-blue-200 text-lg mb-10 text-center">
        Votre plateforme de gestion d'assurance auto
      </p>

      <div className="space-y-4 text-left">
        {['Gestion des contrats', 'Suivi des sinistres', 'Tableaux de bord'].map((text) => (
          <div key={text} className="flex items-center gap-3">
            <CheckCircle size={20} className="text-green-400" />
            <span className="text-blue-100">{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
