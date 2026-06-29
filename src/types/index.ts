export interface UserPhone {
  numeroTelephone: string
  typeTelephone: string
  contactParDefaut: boolean
}

export interface UserAddr {
  numRue: number
  nomRue: string
  codePostal: string
  contactParDefaut: boolean
}

export interface User {
  id: number
  identifier: string
  username: string
  email: string
  firstName: string
  lastName: string
  phone: string
  type: 'physique' | 'morale'
  agencyId: number
  role: 'AGENT' | 'USER'
  // Champs profil complet (retournés par /auth/me)
  nationality?: string
  birthDate?: string
  placeOfBirth?: string
  civility?: string
  cinIssuedOn?: string
  activity?: string
  professionalStatus?: string
  otherNationality?: string
  sourceOfFunds?: string
  hasPublicFunction?: boolean
  hasFamilyPublicFunction?: boolean
  addresses?: UserAddr[]
  phones?: UserPhone[]
}

export interface Vehicle {
  id: number
  registrationNumber: string
  vin: string
  make: string
  model?: string
  year?: string
  manufacturer: string
  vehicleType: string
  vehicleNature: string
  fiscalHorsepower: string
  horsepower: string
  seatingCapacity: string
  payload: string
  grossVehicleWeight: string
  marketValue: number
  listPrice: number
  replacementValue?: number
  vehicleAge: string
  firstRegistrationDate: string
  licenseIssueDate: string
  bonusMalus: string
  isMandatory: boolean
  userId: number
}

export interface Guarantee {
  id: number
  codeGarantie: string
  libelleGarantie: string
  type: 'PACK' | 'OPTIONAL'
  capitalAssure: string
  franchise: string
  taux: string
  isActive: boolean
  description: string
}

export interface Pack {
  id: number
  packCode: string
  packLabel: string
  isActive: boolean
  guarantees: string[]
  basePremium: number
  version: string
  description: string
}

// ── Sous-structures payload ──────────────────────────────────────
export interface UserAddress {
  numRue?: number
  nomRue?: string
  codePostal?: string
  contactParDefaut?: boolean
}

export interface ContractDetails {
  productType?: string
  contractGenerated?: string
  contractNature?: string
  contractSplitType?: string
}

export interface PaymentDetails {
  totalAmount?: string
  feeAmount?: string
  netAmount?: string
}

export interface GuaranteeInfo {
  id: number
  guaranteeCode: string
  guaranteeLabel: string
  insuredCapital?: string
  deductible?: string
  rate?: string
  type?: 'pack' | 'optionnelle'
  displayOrder?: number
}

export interface VehicleProfile {
  registrationNumber: string
  brand?: string
  model?: string
  year?: string
  power?: string
  usefulLoad?: string
  totalWeight?: string
  numberOfSeats?: number
  firstRegistrationDate?: string
  vehicleType?: string
  vehicleNature?: string
  marketValue?: number | string
  serialNumber?: string
  bonusMalus?: string
  mandatorySubscriptionIndicator?: boolean
  manufacturer?: string
  fiscalPower?: number
  catalogValue?: number | string
  replacementValue?: number | string
  vehicleAge?: number
  horsepower?: number
}

export interface PackInfo {
  packCode?: string
  packageCode?: string
}
// ────────────────────────────────────────────────────────────────

export interface Quotation {
  id: number
  quoteNumber: string
  userId: number
  vehicleId: number
  packCode: string
  coverages: number[]
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'ABANDONED'
  creationDate: string
  effectiveDate: string
  expirationDate: string
  installmentType: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL'
  renewalType: 'AUTOMATIC' | 'MANUAL'
  estimatedPremium: number
  agencyCode: string
  contractNumber: string | null
  // Champs payload étendus
  productType?: string
  contractNature?: string
  contractSplitType?: string
  marketValue?: number
  replacementValue?: number
  // Adresse souscripteur (dénormalisée)
  addrNumRue?: number
  addrNomRue?: string
  addrCodePostal?: string
  addrContactParDefaut?: boolean
  // Montants de paiement
  totalAmount?: number
  feeAmount?: number
  netAmount?: number
}

export interface QuotationRequest {
  userId: number
  agencyCode?: string
  userAddress?: UserAddress
  contractDetails?: ContractDetails
  paymentDetails?: PaymentDetails
  quotation?: {
    creationDate?: string
    effectiveDate?: string
    expirationDate?: string
    paymentFrequency?: string
    renewalType?: string
    status?: string
  }
  guarantees?: GuaranteeInfo[]
  optionalGuarantees?: GuaranteeInfo[]
  coverages?: number[]
  vehicleProfile?: VehicleProfile
  pack?: PackInfo
}

export interface Contract {
  id: number
  contractNumber: string
  quotationId: string
  userId: number
  vehicleId: number
  effectiveDate: string
  endDate: string
  paymentFrequency: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL'
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'ONLINE'
  totalPremium: number
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'DRAFT'
  agencyCode: string
  packCode: string
  packLabel: string
  // Champs payload étendus
  identificationNumber?: string
  branch?: string
  branchCode?: string
  contractualDueDate?: string
  subscriberIndicator?: boolean
  insuredIndicator?: boolean
  quoteId?: number
  productType?: string
  contractNature?: string
  contractSplitType?: string
  totalAmount?: number
  feeAmount?: number
  netAmount?: number
}

export interface Claim {
  id: number
  claimNumber: string
  contractId: string
  createdAt?: string
  incidentDate: string
  declarationDate: string
  incidentType: string
  description: string
  location: string
  isThirdPartyInvolved: boolean
  status: 'OPEN' | 'IN_INSTRUCTION' | 'IN_TREATMENT' | 'CLOSED' | 'DECLARED'
  assignedTo: string | null
  indemnityAmount: number | null
}

export type PageType =
  | 'login' | 'register' | 'dashboard'
  | 'users' | 'vehicles' | 'guarantees' | 'agencies'
  | 'quotations' | 'quotation-form'
  | 'contracts' | 'contract-form'
  | 'claims'
  | 'user-portal'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastData {
  message: string
  type: ToastType
}

export interface Agency {
  id: number
  agencyCode: string
  agencyName: string
  isActive: boolean
}
