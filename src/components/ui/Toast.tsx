import { useEffect } from 'react'
import { Check, X, AlertTriangle, Info } from 'lucide-react'
import type { ToastData } from '@/types'

interface ToastProps {
  toast: ToastData
  onClose: () => void
}

export default function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const colors: Record<string, string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  }

  const icons: Record<string, React.ReactNode> = {
    success: <Check size={18} />,
    error: <X size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
  }

  return (
    <div className={`fixed top-4 right-4 z-[100] ${colors[toast.type]} text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in`}>
      {icons[toast.type]}
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X size={14} />
      </button>
    </div>
  )
}
