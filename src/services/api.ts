import axios from 'axios'

// En développement, Vite proxifie /api → http://localhost:8085
// En production, définir VITE_API_URL dans .env
const BASE_URL = (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_API_URL : '') || ''

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Injecter le token JWT automatiquement ─────────────────────────
api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── 401 → vider session et recharger ─────────────────────────────
api.interceptors.response.use(
  (res: any) => res,
  (err: any) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('role')
      localStorage.removeItem('page')
      window.location.reload()
    }
    return Promise.reject(err)
  }
)

// ── AUTH ──────────────────────────────────────────────────────────
export const authApi = {
  login:    (username: string, password: string) =>
    api.post('/api/auth/login', { username, password }),
  register: (data: object) => api.post('/api/auth/register', data),
  me:       ()             => api.get('/api/auth/me'),
}

// ── USERS ─────────────────────────────────────────────────────────
export const usersApi = {
  getAll:          ()                            => api.get('/api/users'),
  getById:         (id: number)                  => api.get(`/api/users/${id}`),
  create:          (data: object)                => api.post('/api/users', data),
  update:          (id: number, d: object)       => api.put(`/api/users/${id}`, d),
  delete:          (id: number)                  => api.delete(`/api/users/${id}`),
  changePassword:  (id: number, newPassword: string) => api.patch(`/api/users/${id}/password`, { newPassword }),
}

// ── VEHICLES ──────────────────────────────────────────────────────
export const vehiclesApi = {
  getAll:    ()                          => api.get('/api/vehicles'),
  getById:   (id: number)                => api.get(`/api/vehicles/${id}`),
  getByUser: (userId: number)            => api.get(`/api/vehicles/user/${userId}`),
  create:    (data: object)              => api.post('/api/vehicles', data),
  update:    (id: number, d: object)     => api.put(`/api/vehicles/${id}`, d),
  delete:    (id: number)                => api.delete(`/api/vehicles/${id}`),
}

// ── GUARANTEES ────────────────────────────────────────────────────
export const guaranteesApi = {
  getAll:  (active?: boolean) =>
    api.get('/api/guarantees', { params: active !== undefined ? { active } : {} }),
  getById: (id: number)            => api.get(`/api/guarantees/${id}`),
  create:  (data: object)          => api.post('/api/guarantees', data),
  update:  (id: number, d: object) => api.put(`/api/guarantees/${id}`, d),
  toggle:  (id: number)            => api.patch(`/api/guarantees/${id}/toggle`),
  delete:  (id: number)            => api.delete(`/api/guarantees/${id}`),
}

// ── PACKS ─────────────────────────────────────────────────────────
export const packsApi = {
  getAll:   (active?: boolean) =>
    api.get('/api/packs', { params: active !== undefined ? { active } : {} }),
  getById:  (id: number)            => api.get(`/api/packs/${id}`),
  getByCode:(code: string)          => api.get(`/api/packs/code/${code}`),
  create:   (data: object)          => api.post('/api/packs', data),
  update:   (id: number, d: object) => api.put(`/api/packs/${id}`, d),
  toggle:   (id: number)            => api.patch(`/api/packs/${id}/toggle`),
  delete:   (id: number)            => api.delete(`/api/packs/${id}`),
}

// ── QUOTATIONS ────────────────────────────────────────────────────
export const quotationsApi = {
  getAll:       ()                           => api.get('/api/quotations'),
  getById:      (id: number)                 => api.get(`/api/quotations/${id}`),
  getByNumber:  (num: string)                => api.get(`/api/quotations/number/${num}`),
  getByUser:    (userId: number)             => api.get(`/api/quotations/user/${userId}`),
  create:       (data: object)               => api.post('/api/quotations', data),
  update:       (id: number, d: object)      => api.put(`/api/quotations/${id}`, d),
  updateStatus: (id: number, status: string) =>
    api.patch(`/api/quotations/${id}/status`, { status }),
}

// ── CONTRACTS ─────────────────────────────────────────────────────
export const contractsApi = {
  getAll:       ()                           => api.get('/api/contracts'),
  getById:      (id: number)                 => api.get(`/api/contracts/${id}`),
  getByNumber:  (num: string)                => api.get(`/api/contracts/number/${num}`),
  getByUser:    (userId: number)             => api.get(`/api/contracts/user/${userId}`),
  create:       (data: object)               => api.post('/api/contracts', data),
  updateStatus: (id: number, status: string) =>
    api.patch(`/api/contracts/${id}/status`, { status }),
  renew:        (id: number)                 => api.patch(`/api/contracts/${id}/renew`),
  triggerRenewal: ()                         => api.post('/api/contracts/trigger-renewal'),
  getHistory:   (id: number)                 => api.get(`/api/contracts/${id}/history`),
}

// ── CLAIMS ────────────────────────────────────────────────────────
export const claimsApi = {
  getAll:    (status?: string) =>
    api.get('/api/claims', { params: status ? { status } : {} }),
  getById:   (id: number)                => api.get(`/api/claims/${id}`),
  getByContract: (contractId: number)    => api.get(`/api/claims/contract/${contractId}`),
  getEligibleGuarantees: (id: number)    => api.get(`/api/claims/${id}/eligible-guarantees`),
  create:    (data: object)              => api.post('/api/claims', data),
  update:    (id: number, d: object)     => api.put(`/api/claims/${id}`, d),
  setIndemnity: (id: number, d: object)  => api.put(`/api/claims/${id}/indemnity`, d),
  close:     (id: number)                => api.patch(`/api/claims/${id}/close`),
  getHistory:   (id: number)             => api.get(`/api/claims/${id}/history`),
}

// ── DOCUMENTS ─────────────────────────────────────────────────────
export const documentsApi = {
  upload: (claimId: number, file: File, documentType = 'AUTRE', uploadedBy?: string) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/api/claims/${claimId}/documents`, form, {
      params: { documentType, uploadedBy },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  list:        (claimId: number) => api.get(`/api/claims/${claimId}/documents`),
  delete:      (docId: number)   => api.delete(`/api/claims/documents/${docId}`),
  downloadUrl: (docId: number)   => `${BASE_URL}/api/claims/documents/${docId}/download`,
}

// ── DASHBOARD ─────────────────────────────────────────────────────
export const dashboardApi = {
  getStats:   ()          => api.get('/api/dashboard/stats'),
  getExpiring:(days = 30) => api.get('/api/dashboard/contracts/expiring', { params: { days } }),
}

// ── PORTAL (USER role) ────────────────────────────────────────────
export const portalApi = {
  changePassword: (newPassword: string) => api.patch('/api/portal/change-password', { newPassword }),
  myVehicles:   () => api.get('/api/portal/my-vehicles'),
  myQuotations: () => api.get('/api/portal/my-quotations'),
  myContracts:  () => api.get('/api/portal/my-contracts'),
  myClaims:     () => api.get('/api/portal/my-claims'),
  declareClaim: (data: object) => api.post('/api/portal/declare-claim', data),
}

// ── AGENCIES ──────────────────────────────────────────────────────
export const agenciesApi = {
  getAll:    ()                          => api.get('/api/agencies'),
  getActive: ()                          => api.get('/api/agencies/active'),
  getById:   (id: number)                => api.get(`/api/agencies/${id}`),
  create:    (data: object)              => api.post('/api/agencies', data),
  update:    (id: number, d: object)     => api.put(`/api/agencies/${id}`, d),
  delete:    (id: number)                => api.delete(`/api/agencies/${id}`),
}
