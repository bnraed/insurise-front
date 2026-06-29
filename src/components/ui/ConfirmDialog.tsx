import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  confirmColor?: string
  children?: React.ReactNode
}

export default function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = 'Confirmer', confirmColor = 'bg-red-600 hover:bg-red-700',
  children,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-[#1A1A2E]">{title}</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">{message}</p>
          {children}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${confirmColor} text-white rounded-lg text-sm font-medium`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
