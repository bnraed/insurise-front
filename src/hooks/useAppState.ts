import { useState, useCallback, createContext, useContext, useEffect } from 'react'
import type { User, Vehicle, Guarantee, Pack, Quotation, Contract, Claim, PageType, ToastData } from '@/types'
import {
  authApi, usersApi, vehiclesApi, guaranteesApi, packsApi,
  quotationsApi, contractsApi, claimsApi,
} from '@/services/api'

interface AppState {
  currentPage: PageType
  setCurrentPage: (page: PageType) => void
  isAuthenticated: boolean
  setIsAuthenticated: (v: boolean) => void
  currentUser: User | null
  setCurrentUser: (u: User | null) => void
  role: 'AGENT' | 'USER' | null
  setRole: (r: 'AGENT' | 'USER' | null) => void
  toast: ToastData | null
  showToast: (message: string, type?: ToastData['type']) => void
  hideToast: () => void
  loading: boolean

  users: User[]
  setUsers: React.Dispatch<React.SetStateAction<User[]>>
  vehicles: Vehicle[]
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>
  guarantees: Guarantee[]
  setGuarantees: React.Dispatch<React.SetStateAction<Guarantee[]>>
  packs: Pack[]
  setPacks: React.Dispatch<React.SetStateAction<Pack[]>>
  quotations: Quotation[]
  setQuotations: React.Dispatch<React.SetStateAction<Quotation[]>>
  contracts: Contract[]
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>
  claims: Claim[]
  setClaims: React.Dispatch<React.SetStateAction<Claim[]>>

  refreshCurrentUser: () => Promise<'AGENT' | 'USER' | undefined>
  refreshUsers: () => Promise<void>
  refreshVehicles: () => Promise<void>
  refreshGuarantees: () => Promise<void>
  refreshPacks: () => Promise<void>
  refreshQuotations: () => Promise<void>
  refreshContracts: () => Promise<void>
  refreshClaims: () => Promise<void>

  getUserById: (id: number) => User | undefined
  getVehicleById: (id: number) => Vehicle | undefined
  getVehiclesByUserId: (userId: number) => Vehicle[]
  getPackByCode: (code: string) => Pack | undefined
  getGuaranteeByCode: (code: string) => Guarantee | undefined
  getGuaranteesByPackCode: (packCode: string) => Guarantee[]
  getContractByNumber: (num: string) => Contract | undefined
}

export const AppContext = createContext<AppState | null>(null)

export function useAppState(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used inside AppProvider')
  return ctx
}

function mapUser(u: any): User {
  return {
    id:         u.id,
    identifier: u.identifier || '',
    username:   u.username   || '',
    email:      u.email      || '',
    firstName:  u.firstName  || '',
    lastName:   u.lastName   || '',
    phone:      u.phone      || '',
    type:       u.type       || 'physique',
    agencyId:   u.agencyId   || 1,
    role:       u.role       || 'AGENT',
  }
}

function mapVehicle(v: any): Vehicle {
  const ownerId = v.owner?.id ?? v.userId ?? 0
  return {
    id:                   v.id,
    registrationNumber:   v.registrationNumber || '',
    vin:                  v.vin                || '',
    make:                 v.make               || '',
    manufacturer:         v.manufacturer       || '',
    vehicleType:          v.vehicleType        || '',
    vehicleNature:        v.vehicleNature      || '',
    fiscalHorsepower:     v.fiscalHorsepower   || '',
    horsepower:           v.horsepower         || '',
    seatingCapacity:      v.seatingCapacity    || '',
    payload:              v.payload            || '',
    grossVehicleWeight:   v.grossVehicleWeight || '',
    marketValue:          v.marketValue != null ? Number(v.marketValue) : 0,
    listPrice:            v.listPrice   != null ? Number(v.listPrice)   : 0,
    vehicleAge:           v.vehicleAge          || '',
    firstRegistrationDate: v.firstRegistrationDate || '',
    licenseIssueDate:     v.licenseIssueDate    || '',
    bonusMalus:           v.bonusMalus          || '',
    isMandatory:          v.isMandatory         ?? false,
    userId:               Number(ownerId),
  }
}

function mapGuarantee(g: any): Guarantee {
  return {
    id:               g.id,
    codeGarantie:     g.codeGarantie    || '',
    libelleGarantie:  g.libelleGarantie || '',
    type:             g.type            || 'OPTIONAL',
    capitalAssure:    g.capitalAssure   || '',
    franchise:        g.franchise       || '',
    taux:             g.taux            || '',
    isActive:         g.isActive        ?? true,
    description:      g.description     || '',
  }
}

function mapPack(p: any): Pack {
  return {
    id:          p.id,
    packCode:    p.packCode  || '',
    packLabel:   p.packLabel || '',
    isActive:    p.isActive  ?? true,
    guarantees:  (p.guarantees || []).map((g: any) =>
      typeof g === 'string' ? g : (g.codeGarantie || '')
    ).filter(Boolean),
    basePremium: p.basePremium != null ? Number(p.basePremium) : 0,
    version:     p.version     || '',
    description: p.description || '',
  }
}

function mapQuotation(q: any): Quotation {
  return {
    id:               q.id,
    quoteNumber:      q.quoteNumber     || '',
    userId:           q.user?.id        ?? q.userId    ?? 0,
    vehicleId:        q.vehicle?.id     ?? q.vehicleId ?? 0,
    packCode:         q.pack?.packCode  ?? q.packCode  ?? '',
    coverages:        q.coverages       || [],
    status:           q.status          || 'PENDING',
    creationDate:     q.creationDate    || '',
    effectiveDate:    q.effectiveDate   || '',
    expirationDate:   q.expirationDate  || '',
    installmentType:  q.installmentType || 'ANNUAL',
    renewalType:      q.renewalType     || 'AUTOMATIC',
    estimatedPremium: q.estimatedPremium != null ? Number(q.estimatedPremium) : 0,
    agencyCode:       q.agencyCode      || '',
    contractNumber:   null,
    productType:      q.productType      ?? undefined,
    contractNature:   q.contractNature   ?? undefined,
    contractSplitType: q.contractSplitType ?? undefined,
    marketValue:      q.marketValue      != null ? Number(q.marketValue)      : undefined,
    replacementValue: q.replacementValue != null ? Number(q.replacementValue) : undefined,
  }
}

function mapContract(c: any): Contract {
  return {
    id:               c.id,
    contractNumber:   c.contractNumber  || '',
    quotationId:      c.quotation?.quoteNumber ?? c.quotationId ?? '',
    userId:           c.user?.id        ?? c.userId    ?? 0,
    vehicleId:        c.vehicle?.id     ?? c.vehicleId ?? 0,
    effectiveDate:    c.effectiveDate   || '',
    endDate:          c.endDate         || '',
    paymentFrequency: c.paymentFrequency || 'ANNUAL',
    paymentMethod:    c.paymentMethod   || 'BANK_TRANSFER',
    totalPremium:     c.totalPremium != null ? Number(c.totalPremium) : 0,
    status:           c.status          || 'DRAFT',
    agencyCode:       c.agencyCode      || '',
    packCode:         c.packCode  ?? c.quotation?.pack?.packCode  ?? '',
    packLabel:        c.packLabel ?? c.quotation?.pack?.packLabel ?? '',
    identificationNumber: c.identificationNumber ?? undefined,
    branch:               c.branch               ?? undefined,
    branchCode:           c.branchCode            ?? undefined,
    contractualDueDate:   c.contractualDueDate    ?? undefined,
    subscriberIndicator:  c.subscriberIndicator   ?? undefined,
    insuredIndicator:     c.insuredIndicator      ?? undefined,
    quoteId:              c.quoteId               ?? undefined,
    productType:          c.productType           ?? undefined,
    contractNature:       c.contractNature        ?? undefined,
    contractSplitType:    c.contractSplitType     ?? undefined,
    totalAmount:          c.totalAmount  != null ? Number(c.totalAmount)  : undefined,
    feeAmount:            c.feeAmount    != null ? Number(c.feeAmount)    : undefined,
    netAmount:            c.netAmount    != null ? Number(c.netAmount)    : undefined,
  }
}

function mapClaim(c: any): Claim {
  return {
    id:                   c.id,
    claimNumber:          c.claimNumber          || '',
    contractId:           c.contract?.contractNumber ?? c.contractId ?? '',
    incidentDate:         c.incidentDate          || '',
    declarationDate:      c.declarationDate       || '',
    incidentType:         c.incidentType          || '',
    description:          c.description           || '',
    location:             c.location              || '',
    isThirdPartyInvolved: c.isThirdPartyInvolved  ?? false,
    status:               c.status                || 'OPEN',
    assignedTo:           c.assignedTo            ?? null,
    indemnityAmount:      c.indemnityAmount        ?? null,
    createdAt:            c.createdAt             || '',
  }
}

export function useAppProvider(): AppState {

  const storedToken = localStorage.getItem('token')
  const storedUser  = localStorage.getItem('user')
  const storedRole  = localStorage.getItem('role') as 'AGENT' | 'USER' | null
  const storedPage  = localStorage.getItem('page') as PageType | null

  const NON_RESTORABLE: PageType[] = ['login', 'register', 'user-portal']

  const initialPage: PageType = storedToken
    ? (storedRole === 'USER'
        ? 'user-portal'
        : (storedPage && !NON_RESTORABLE.includes(storedPage) ? storedPage : 'dashboard'))
    : 'login'

  const [_currentPage, _setCurrentPage] = useState<PageType>(initialPage)
  const setCurrentPage = useCallback((page: PageType) => {
    _setCurrentPage(page)
    if (!NON_RESTORABLE.includes(page)) {
      localStorage.setItem('page', page)
    }
  }, [])
  const currentPage = _currentPage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!storedToken)
  const [currentUser, setCurrentUser]         = useState<User | null>(
    storedUser ? JSON.parse(storedUser) : null
  )
  const [role, setRole] = useState<'AGENT' | 'USER' | null>(storedRole)
  const [toast, setToast]   = useState<ToastData | null>(null)
  const [loading, setLoading] = useState(false)

  const [users, setUsers]           = useState<User[]>([])
  const [vehicles, setVehicles]     = useState<Vehicle[]>([])
  const [guarantees, setGuarantees] = useState<Guarantee[]>([])
  const [packs, setPacks]           = useState<Pack[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [contracts, setContracts]   = useState<Contract[]>([])
  const [claims, setClaims]         = useState<Claim[]>([])

  const showToast = useCallback((message: string, type: ToastData['type'] = 'success') => {
    setToast({ message, type })
  }, [])
  const hideToast = useCallback(() => setToast(null), [])

  const refreshCurrentUser = useCallback(async () => {
    try {
      const r = await authApi.me()
      const user = r.data
      if (!user) return
      const freshRole: 'AGENT' | 'USER' = user.role || 'AGENT'
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('role', freshRole)
      setCurrentUser(user)
      setRole(freshRole)
      if (freshRole === 'USER') {
        setCurrentPage('user-portal')
      }
      return freshRole
    } catch (e) { console.error('refreshCurrentUser', e) }
  }, [])

  // ✅ Tous les refresh remplacent complètement (plus de mergeList)
  const refreshUsers = useCallback(async () => {
    try {
      const r = await usersApi.getAll()
      setUsers((r.data || []).map(mapUser).reverse())
    } catch (e) { console.error('refreshUsers', e) }
  }, [])

  const refreshVehicles = useCallback(async () => {
    try {
      const r = await vehiclesApi.getAll()
      setVehicles((r.data || []).map(mapVehicle).reverse())
    } catch (e) { console.error('refreshVehicles', e) }
  }, [])

  const refreshGuarantees = useCallback(async () => {
    try {
      const r = await guaranteesApi.getAll()
      setGuarantees((r.data || []).map(mapGuarantee).reverse())
    } catch (e) { console.error('refreshGuarantees', e) }
  }, [])

  const refreshPacks = useCallback(async () => {
    try {
      const r = await packsApi.getAll()
      setPacks((r.data || []).map(mapPack).reverse())
    } catch (e) { console.error('refreshPacks', e) }
  }, [])

  const refreshQuotations = useCallback(async () => {
    try {
      const r = await quotationsApi.getAll()
      setQuotations((r.data || []).map(mapQuotation).reverse())
    } catch (e) { console.error('refreshQuotations', e) }
  }, [])

  const refreshContracts = useCallback(async () => {
    try {
      const r = await contractsApi.getAll()
      setContracts((r.data || []).map(mapContract).reverse())
    } catch (e) { console.error('refreshContracts', e) }
  }, [])

  const refreshClaims = useCallback(async () => {
    try {
      const r = await claimsApi.getAll()
      setClaims((r.data || []).map(mapClaim))
    } catch (e) { console.error('refreshClaims', e) }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    const currentRole = localStorage.getItem('role') as 'AGENT' | 'USER' | null
    const loadAll = async () => {
      setLoading(true)
      try {
        if (currentRole === 'USER') {
          const [qRes, cRes, clRes] = await Promise.all([
            quotationsApi.getAll(),
            contractsApi.getAll(),
            claimsApi.getAll(),
          ])
          setQuotations((qRes.data  || []).map(mapQuotation).reverse())
          setContracts( (cRes.data  || []).map(mapContract).reverse())
          setClaims(    (clRes.data || []).map(mapClaim))
        } else {
          const [uRes, vRes, gRes, pkRes, qRes, cRes, clRes] = await Promise.all([
            usersApi.getAll(),
            vehiclesApi.getAll(),
            guaranteesApi.getAll(),
            packsApi.getAll(),
            quotationsApi.getAll(),
            contractsApi.getAll(),
            claimsApi.getAll(),
          ])
          setUsers(     (uRes.data   || []).map(mapUser).reverse())
          setVehicles(  (vRes.data   || []).map(mapVehicle).reverse())
          setGuarantees((gRes.data   || []).map(mapGuarantee).reverse())
          setPacks(     (pkRes.data  || []).map(mapPack).reverse())
          setQuotations((qRes.data   || []).map(mapQuotation).reverse())
          setContracts( (cRes.data   || []).map(mapContract).reverse())
          setClaims(    (clRes.data  || []).map(mapClaim))
        }
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [isAuthenticated])

  const getUserById        = useCallback((id: number) => users.find(u => u.id === id), [users])
  const getVehicleById     = useCallback((id: number) => vehicles.find(v => v.id === id), [vehicles])
  const getVehiclesByUserId = useCallback((userId: number) => vehicles.filter(v => v.userId === userId), [vehicles])
  const getPackByCode      = useCallback((code: string) => packs.find(p => p.packCode === code), [packs])
  const getGuaranteeByCode = useCallback((code: string) => guarantees.find(g => g.codeGarantie === code), [guarantees])
  const getGuaranteesByPackCode = useCallback((packCode: string) => {
    const pack = packs.find(p => p.packCode === packCode)
    if (!pack) return []
    return pack.guarantees
      .map(c => guarantees.find(g => g.codeGarantie === c))
      .filter(Boolean) as Guarantee[]
  }, [packs, guarantees])
  const getContractByNumber = useCallback((num: string) => contracts.find(c => c.contractNumber === num), [contracts])

  return {
    currentPage, setCurrentPage,
    isAuthenticated, setIsAuthenticated,
    currentUser, setCurrentUser,
    role, setRole,
    toast, showToast, hideToast,
    loading,
    users, setUsers,
    vehicles, setVehicles,
    guarantees, setGuarantees,
    packs, setPacks,
    quotations, setQuotations,
    contracts, setContracts,
    claims, setClaims,
    refreshCurrentUser, refreshUsers, refreshVehicles, refreshGuarantees, refreshPacks,
    refreshQuotations, refreshContracts, refreshClaims,
    getUserById, getVehicleById, getVehiclesByUserId,
    getPackByCode, getGuaranteeByCode, getGuaranteesByPackCode,
    getContractByNumber,
  }
}