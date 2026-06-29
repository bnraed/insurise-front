import { getStatusColor } from '@/utils/helpers'

interface BadgeProps {
  label: string
  status?: string
  className?: string
}

export default function Badge({ label, status, className = '' }: BadgeProps) {
  const color = status ? getStatusColor(status) : 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${color} ${className}`}>
      {label}
    </span>
  )
}
