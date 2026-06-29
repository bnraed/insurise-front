import type { Guarantee, Vehicle } from '@/types'

export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Gardés pour compatibilité — les numéros sont générés côté back désormais
export const generateQuoteNumber    = (): string => `QT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
export const generateContractNumber = (): string => `CT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
export const generateClaimNumber    = (): string => `CLM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

export const calculatePremium = (vehicle: Vehicle | undefined, guarantees: Guarantee[]): number => {
  if (!vehicle) return 0
  return guarantees.reduce((sum, g) => sum + (vehicle.marketValue * parseFloat(g.taux || '0')) / 100, 0)
}

export const calculateInstallment = (premium: number, frequency: string): number => {
  const divisor: Record<string, number> = { MONTHLY: 12, QUARTERLY: 4, SEMI_ANNUAL: 2, ANNUAL: 1 }
  return premium / (divisor[frequency] || 1)
}

export const validateEmail = (email: string): boolean => /\S+@\S+\.\S+/.test(email)

export const getStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700', SUSPENDED: 'bg-yellow-100 text-yellow-700',
    CANCELLED: 'bg-red-100 text-red-700', PENDING: 'bg-blue-100 text-blue-700',
    ACCEPTED: 'bg-green-100 text-green-700', EXPIRED: 'bg-gray-100 text-gray-600',
    ABANDONED: 'bg-gray-100 text-gray-600', OPEN: 'bg-red-100 text-red-700',
    IN_INSTRUCTION: 'bg-yellow-100 text-yellow-700', IN_TREATMENT: 'bg-blue-100 text-blue-700',
    CLOSED: 'bg-green-100 text-green-700', PACK: 'bg-blue-100 text-blue-700', OPTIONAL: 'bg-orange-100 text-orange-700',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}

export const getStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    ACTIVE: 'Actif', SUSPENDED: 'Suspendu', CANCELLED: 'Resilie',
    PENDING: 'En attente', ACCEPTED: 'Accepte', EXPIRED: 'Expire', ABANDONED: 'Abandonne',
    OPEN: 'Ouvert', IN_INSTRUCTION: 'En instruction', IN_TREATMENT: 'En traitement', CLOSED: 'Cloture',
    DECLARED: 'Declare',
  }
  return map[status] || status
}

export const getIncidentTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    COLLISION: 'Collision', VOL: 'Vol', INCENDIE: 'Incendie',
    BRIS_GLACE: 'Bris de glace', CATASTROPHE_NATURELLE: 'Catastrophe naturelle', AUTRE: 'Autre',
  }
  return map[type] || type
}

export const todayStr = (): string => new Date().toISOString().split('T')[0]
