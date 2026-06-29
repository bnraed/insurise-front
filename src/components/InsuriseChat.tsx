import { useState, useRef, useEffect } from 'react'
import { X, Loader2, Bot, Send, MessageSquare, AlertCircle, CheckCircle, FileText, Car } from 'lucide-react'
import { useAppState } from '@/hooks/useAppState'

const AI_API = window.location.hostname === 'localhost'
  ? ''
  : 'http://54.87.232.38:8080'
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  status?: 'completed' | 'error'
  claimNumber?: string
  isCovered?: boolean
  estimation?: string
  isTyping?: boolean
  // Sélecteurs
  isVehicleSelector?: boolean
  vehicles?: VehicleOption[]
  isContractSelector?: boolean
  contracts?: ContractOption[]
}

interface VehicleOption {
  vehicle_id: number
  make: string
  model: string
  year: string
  registration_number: string
  market_value: string
  vehicle_type: string
}

interface ContractOption {
  contract_id: number
  contract_number: string
  status: string
  effective_date: string
  end_date: string
  pack_label: string
  pack_code: string
  vehicle: string
}

type ChatMode = 'general' | 'sinistre'
const STORAGE_KEY_PREFIX = 'insurise_chat_'

const GENERAL_SUGGESTIONS = [
  { icon: '📦', label: 'Packs disponibles', text: 'Quels sont les packs d\'assurance disponibles chez INSURISE ?' },
  { icon: '⚖️', label: 'Tiers vs Tous Risques', text: 'Quelle est la différence entre le pack Tiers et le pack Tous Risques ?' },
  { icon: '🛡️', label: 'Garanties incluses', text: 'Quelles garanties sont incluses dans chaque pack ?' },
  { icon: '🔍', label: 'Quel pack choisir ?', text: 'Quel pack me recommandez-vous pour mon véhicule ?' },
  { icon: '🚨', label: 'Déclarer un sinistre', text: 'Comment se passe la déclaration de sinistre ?' },
  { icon: '🪟', label: 'Bris de glace', text: 'Est-ce que le bris de glace est couvert ?' },
  { icon: '🚗', label: 'Vol de véhicule', text: 'Est-ce que le vol de véhicule est couvert ?' },
  { icon: '📋', label: 'Garantie RC', text: 'Qu\'est-ce que la responsabilité civile auto couvre ?' },
]

const SINISTRE_SUGGESTIONS_INCIDENT = [
  { icon: '🚗', label: 'Accident', text: "J'ai eu un accident de la circulation" },
  { icon: '🚨', label: 'Vol', text: 'Mon véhicule a été volé' },
  { icon: '💧', label: 'Intempéries', text: "Mon véhicule a subi des dégâts suite à des intempéries" },
  { icon: '🪟', label: 'Bris de glace', text: 'Bris de glace sur mon véhicule' },
  { icon: '🔥', label: 'Incendie', text: 'Mon véhicule a pris feu' },
  { icon: '🏍️', label: 'Collision', text: "Collision avec un autre véhicule" },
]

const fmtDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const getSinistreSuggestions = (lastMsg: string) => {
  const m = lastMsg.toLowerCase()

  if (m.includes('date') || m.includes('quand') || m.includes('quel jour')) {
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    const twoDays = new Date(today); twoDays.setDate(today.getDate() - 2)
    return [
      { icon: '📅', label: "Aujourd'hui", text: `Aujourd'hui le ${fmtDate(today)}` },
      { icon: '📅', label: 'Hier', text: `Hier le ${fmtDate(yesterday)}` },
      { icon: '📅', label: 'Avant-hier', text: `Le ${fmtDate(twoDays)}` },
    ]
  }

  if (m.includes('lieu') || m.includes('où') || m.includes('endroit') || m.includes('adresse') || m.includes('localisation')) {
    return [
      { icon: '🏙️', label: 'Centre-ville', text: 'En centre-ville' },
      { icon: '🛣️', label: 'Autoroute', text: "Sur l'autoroute" },
      { icon: '🅿️', label: 'Parking', text: 'Dans un parking' },
      { icon: '🏘️', label: 'Quartier résidentiel', text: 'Dans un quartier résidentiel' },
      { icon: '🛤️', label: 'Route nationale', text: 'Sur une route nationale' },
    ]
  }

  if (m.includes('tiers') || m.includes('autre véhicule') || m.includes('autre personne') || m.includes('impliqué')) {
    return [
      { icon: '✅', label: 'Oui, un tiers', text: 'Oui, un tiers est impliqué' },
      { icon: '❌', label: 'Non', text: 'Non, pas de tiers impliqué' },
    ]
  }

  if (m.includes('dommage') || m.includes('dégât') || m.includes('état') || m.includes('gravité') || m.includes('grave')) {
    return [
      { icon: '🟢', label: 'Léger', text: 'Dégâts légers, véhicule toujours en état de marche' },
      { icon: '🟡', label: 'Modéré', text: 'Dégâts modérés, véhicule partiellement endommagé' },
      { icon: '🔴', label: 'Grave', text: 'Dégâts graves, véhicule immobilisé' },
    ]
  }

  if (m.includes('blessé') || m.includes('victime') || m.includes('blessure') || m.includes('personne')) {
    return [
      { icon: '✅', label: 'Oui, blessés', text: 'Oui, il y a des blessés' },
      { icon: '❌', label: 'Aucun blessé', text: 'Non, pas de blessés' },
    ]
  }

  if (m.includes('décri') || m.includes('passé') || m.includes('sinistre') || m.includes('incident') || m.includes('type') || m.includes('nature')) {
    return SINISTRE_SUGGESTIONS_INCIDENT
  }

  return SINISTRE_SUGGESTIONS_INCIDENT
}

export default function InsuriseChat() {
  const { currentUser } = useAppState()
  const userId = currentUser?.id ?? null
  const storageKey = `${STORAGE_KEY_PREFIX}${userId}`

  const defaultMessages = (): Message[] => [{
    id: '0', role: 'assistant', timestamp: new Date(),
    content: currentUser
      ? `Bonjour ${currentUser.firstName || currentUser.username} ! 👋\nJe suis INSURIS, votre assistant IA.\n\n• 📦 Packs & garanties\n• 🚗 Recommandation selon votre véhicule\n• 📋 Vos contrats & sinistres\n• 🚨 Déclarer un sinistre`
      : `Bonjour ! Je suis INSURIS.\nPosez-moi vos questions sur nos packs et garanties.`,
  }]

  const loadMessages = (): Message[] => {
    if (!userId) return defaultMessages()
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) return JSON.parse(saved).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
    } catch {}
    return defaultMessages()
  }

  const [isOpen, setIsOpen]         = useState(false)
  const [mode, setMode]             = useState<ChatMode>('general')
  const [messages, setMessages]     = useState<Message[]>(loadMessages)
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [unread, setUnread]         = useState(0)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption | null>(null)
  const [selectedContract, setSelectedContract] = useState<ContractOption | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)
  const typingIntervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set())
  const contractInjectedRef = useRef(false)

  // Persistance localStorage
  useEffect(() => {
    if (userId) localStorage.setItem(storageKey, JSON.stringify(messages))
  }, [messages, userId, storageKey])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }) }, [messages])
  useEffect(() => {
    if (isOpen) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100) }
  }, [isOpen])
  useEffect(() => {
    if (!isOpen) { const t = setTimeout(() => setUnread(u => u || 1), 5000); return () => clearTimeout(t) }
  }, [isOpen])

  // Effacer au logout
  useEffect(() => {
    const handler = () => {
      if (userId) localStorage.removeItem(storageKey)
      setMessages(defaultMessages())
      setSelectedVehicle(null)
      setSelectedContract(null)
      setMode('general')
    }
    window.addEventListener('insurise-logout', handler)
    return () => window.removeEventListener('insurise-logout', handler)
  }, [userId, storageKey])

  const addMsg = (role: 'user' | 'assistant', content: string, extra?: Partial<Message>) =>
    setMessages(p => [...p, { id: Date.now().toString(), role, content, timestamp: new Date(), ...extra }])

  const addMsgTyping = (content: string, extra?: Partial<Message>) => {
    const id = Date.now().toString()
    setMessages(p => [...p, { id, role: 'assistant', timestamp: new Date(), ...extra, content: '', isTyping: true }])
    let i = 0
    const speed = content.length < 200 ? 12 : content.length < 500 ? 8 : 5
    const iv = setInterval(() => {
      i++
      setMessages(p => p.map(m => m.id === id ? { ...m, content: content.slice(0, i), isTyping: i < content.length } : m))
      if (i >= content.length) {
        clearInterval(iv)
        typingIntervalsRef.current.delete(iv)
      }
    }, speed)
    typingIntervalsRef.current.add(iv)
  }

  const getHistory = () =>
    messages
      .filter(m => m.id !== '0' && !m.isVehicleSelector && !m.isContractSelector)
      .map(m => ({ role: m.role, content: m.content }))

  // ================================================================
  // DÉMARRER LE MODE SINISTRE — étape 1 : choisir le véhicule
  // ================================================================
  const startSinistreMode = async () => {
    setMode('sinistre')
    setSelectedVehicle(null)
    setSelectedContract(null)
    contractInjectedRef.current = false
    setMessages([{ id: Date.now().toString(), role: 'assistant', timestamp: new Date(),
      content: `🚨 Déclaration de sinistre\n\nChargement de vos véhicules...` }])
    setLoading(true)
    try {
      const res = await fetch(`${AI_API}/api/sinistre/vehicules/${userId}`)
      const data = await res.json()
      if (data.status === 'error') {
        setMessages([{ id: Date.now().toString(), role: 'assistant', timestamp: new Date(), content: data.message }])
        return
      }
      if (data.status === 'single_vehicle') {
        // Un seul véhicule → passer directement aux contrats
        await selectVehicle(data.vehicle)
      } else {
        setMessages([{ id: Date.now().toString(), role: 'assistant', timestamp: new Date(),
          content: `Vous avez **${data.count} véhicules**.\nPour quel véhicule souhaitez-vous déclarer un sinistre ?`,
          isVehicleSelector: true, vehicles: data.vehicles }])
      }
    } finally { setLoading(false) }
  }

  // ================================================================
  // ÉTAPE 2 : CHOISIR LE CONTRAT pour ce véhicule
  // ================================================================
  const selectVehicle = async (vehicle: VehicleOption) => {
    setSelectedVehicle(vehicle)
    // Marquer le sélecteur comme traité
    setMessages(prev => prev.map(m =>
      m.isVehicleSelector
        ? { ...m, isVehicleSelector: false, vehicles: undefined,
            content: `🚗 Véhicule sélectionné : **${vehicle.make} ${vehicle.model} (${vehicle.year})** — ${vehicle.registration_number}` }
        : m
    ))
    setLoading(true)
    try {
      const res = await fetch(`${AI_API}/api/sinistre/contrats/vehicule/${vehicle.vehicle_id}`)
      const data = await res.json()
      if (data.status === 'error') {
        addMsgTyping(data.message)
        return
      }
      if (data.status === 'single_contract') {
        await selectContract(data.contract)
      } else {
        addMsg('assistant',
          `Ce véhicule a **${data.count} contrats actifs**.\nLequel souhaitez-vous utiliser ?`,
          { isContractSelector: true, contracts: data.contracts }
        )
      }
    } finally { setLoading(false) }
  }

  // ================================================================
  // ÉTAPE 3 : CONTRAT SÉLECTIONNÉ → démarrer le chat
  // ================================================================
  const selectContract = async (contract: ContractOption) => {
    setSelectedContract(contract)
    contractInjectedRef.current = false
    setMessages(prev => prev.map(m =>
      m.isContractSelector
        ? { ...m, isContractSelector: false, contracts: undefined,
            content: `📋 Contrat sélectionné : **${contract.contract_number}** — ${contract.pack_label}` }
        : m
    ))
    addMsgTyping(`Parfait ! Décrivez-moi ce qui s'est passé et je vous guide étape par étape. 🤝`)
  }

  // ================================================================
  // ENVOYER MESSAGE GÉNÉRAL
  // ================================================================
  const sendGeneral = async (text: string) => {
    try {
      const res = await fetch(`${AI_API}/api/chat/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, userId, history: getHistory() }),
      })
      addMsgTyping(await res.text())
      if (!isOpen) setUnread(u => u + 1)
    } catch { addMsgTyping('❌ Service temporairement indisponible.') }
  }

  // ================================================================
  // ENVOYER MESSAGE SINISTRE
  // ================================================================
  const sendSinistre = async (text: string) => {
    if (!selectedContract) { addMsgTyping('⚠️ Choisissez d\'abord un contrat.'); return }

    // Bloquer toute date future dans le message
    const dateMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
    if (dateMatch) {
      const inputDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T00:00:00`)
      const today = new Date(); today.setHours(0, 0, 0, 0)
      if (inputDate > today) {
        addMsgTyping('❌ La date de l\'incident ne peut pas être dans le futur. Veuillez saisir une date passée (format YYYY-MM-DD).')
        return
      }
    }

    try {
      const history = getHistory()
      const userMsgs = history.filter(h => h.role === 'user')
      const isFirst = userMsgs.length === 0
      const endpoint = isFirst ? '/api/sinistre/declarer' : '/api/sinistre/continuer'
      const body = isFirst
        ? { message: text, userId, contract_number: selectedContract.contract_number }
        : { message: text, userId, history, contract_number: selectedContract.contract_number }

      const res = await fetch(`${AI_API}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.status === 'completed') {
        addMsgTyping(data.message, {
          status: 'completed',
          claimNumber: data.claim_number,
          isCovered: data.is_covered,
          estimation: data.estimation,
        })
        window.dispatchEvent(new CustomEvent('claim-created', { detail: data }))
        setSelectedVehicle(null)
        setSelectedContract(null)
      } else if (data.status === 'contract_not_found') {
        // Injecter automatiquement le bon contrat (une seule fois)
        if (!contractInjectedRef.current) {
          contractInjectedRef.current = true
          const retryRes = await fetch(`${AI_API}/api/sinistre/continuer`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: selectedContract.contract_number, userId,
              contract_number: selectedContract.contract_number,
              history: [...history, { role: 'assistant', content: data.message }],
            }),
          })
          const retryData = await retryRes.json()
          addMsgTyping(retryData.message, {
            status: retryData.status === 'completed' ? 'completed' : undefined,
            claimNumber: retryData.claim_number,
            isCovered: retryData.is_covered,
            estimation: retryData.estimation,
          })
          if (retryData.status === 'completed') {
            window.dispatchEvent(new CustomEvent('claim-created', { detail: retryData }))
            setSelectedVehicle(null)
            setSelectedContract(null)
          }
        } else {
          addMsgTyping(data.message)
        }
      } else if (data.status === 'error') {
        addMsgTyping(data.message, { status: 'error' })
      } else {
        const msgLower = (data.message || '').toLowerCase()
        // N'injecter le contrat que si le bot le DEMANDE (pas quand il le confirme/mentionne)
        const isAskingForContract =
          !contractInjectedRef.current &&
          (msgLower.includes('numéro de contrat') || msgLower.includes('numero de contrat')) &&
          !data.message.includes(selectedContract.contract_number)
        if (isAskingForContract) {
          contractInjectedRef.current = true
          addMsgTyping(data.message)
          setTimeout(() => {
            addMsg('user', selectedContract.contract_number)
            sendSinistre(selectedContract.contract_number)
          }, 500)
          return
        }
        addMsgTyping(data.message)
      }
      if (!isOpen) setUnread(u => u + 1)
    } catch { addMsgTyping('❌ Service temporairement indisponible.') }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    addMsg('user', text)
    setInput('')
    setLoading(true)
    try {
      if (mode === 'sinistre') await sendSinistre(text)
      else await sendGeneral(text)
    } finally { setLoading(false) }
  }

  const sendSuggestion = async (text: string) => {
    if (loading) return
    addMsg('user', text)
    setLoading(true)
    try {
      if (mode === 'sinistre') await sendSinistre(text)
      else await sendGeneral(text)
    } finally { setLoading(false) }
  }

  const switchMode = (newMode: ChatMode) => {
    if (newMode === 'sinistre') startSinistreMode()
    else { setMode('general'); setSelectedVehicle(null); setSelectedContract(null); setMessages(defaultMessages()) }
  }

  const clearChat = () => {
    typingIntervalsRef.current.forEach(iv => clearInterval(iv))
    typingIntervalsRef.current.clear()
    if (userId) localStorage.removeItem(storageKey)
    setSelectedVehicle(null); setSelectedContract(null)
    setMessages(defaultMessages()); setMode('general')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const fmt = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const inputDisabled = loading || (mode === 'sinistre' && (!selectedVehicle || !selectedContract))

  return (
    <>
      {!isOpen && (
        <button onClick={() => { setIsOpen(true); setUnread(0) }}
          className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 bg-[#E8003D] hover:bg-red-700 text-white pl-4 pr-5 py-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95">
          <Bot size={20} />
          <span className="text-sm font-semibold whitespace-nowrap">Assistant IA</span>
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-yellow-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce">{unread}</span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col w-[410px] h-[600px] bg-white rounded-2xl border border-gray-200 overflow-hidden"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#1E3A5F] text-white shrink-0">
            <div className="bg-[#E8003D] rounded-full p-1.5 shrink-0"><Bot size={15} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none">INSURIS · Assistant IA</p>
              <p className="text-xs text-blue-200 mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse" />
                {currentUser ? `${currentUser.firstName || currentUser.username}` : 'Mode public'} · Groq llama-3.3
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={clearChat} title="Nouvelle conversation" className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><MessageSquare size={14} /></button>
              <button onClick={() => setIsOpen(false)} title="Fermer" className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X size={14} /></button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 shrink-0">
            <button onClick={() => switchMode('general')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${mode === 'general' ? 'text-[#1E3A5F] border-b-2 border-[#E8003D] bg-red-50' : 'text-gray-400 hover:text-gray-600'}`}>
              💬 Assistant
            </button>
            <button onClick={() => switchMode('sinistre')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${mode === 'sinistre' ? 'text-[#1E3A5F] border-b-2 border-[#E8003D] bg-red-50' : 'text-gray-400 hover:text-gray-600'}`}>
              🚨 Déclarer un sinistre
            </button>
          </div>

          {/* Breadcrumb véhicule/contrat sélectionné */}
          {mode === 'sinistre' && (selectedVehicle || selectedContract) && (
            <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-100 flex items-center gap-2 shrink-0 text-xs">
              {selectedVehicle && (
                <span className="flex items-center gap-1 text-blue-700">
                  <Car size={11} />
                  {selectedVehicle.make} {selectedVehicle.model}
                </span>
              )}
              {selectedVehicle && selectedContract && <span className="text-blue-300">›</span>}
              {selectedContract && (
                <span className="flex items-center gap-1 text-blue-700">
                  <FileText size={11} />
                  {selectedContract.contract_number} — {selectedContract.pack_label}
                </span>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map(msg => (
              <div key={msg.id}>
                {/* Sélecteur de véhicules */}
                {msg.isVehicleSelector && msg.vehicles ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#1E3A5F] flex items-center justify-center shrink-0"><Bot size={13} className="text-white" /></div>
                      <div className="bg-white rounded-2xl rounded-tl-none px-3 py-2 shadow-sm border border-gray-100 max-w-[82%]">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}{msg.isTyping && <span className="inline-block w-px h-3.5 bg-gray-500 animate-pulse align-middle ml-0.5" />}</p>
                        <p className="text-xs text-gray-400 mt-1">{fmt(msg.timestamp)}</p>
                      </div>
                    </div>
                    <div className="ml-9 space-y-2">
                      {msg.vehicles.map(v => (
                        <button key={v.vehicle_id} onClick={() => selectVehicle(v)}
                          className="w-full text-left bg-white border border-gray-200 hover:border-[#E8003D] hover:bg-red-50 rounded-xl px-3 py-2.5 transition-all group">
                          <div className="flex items-center gap-2">
                            <Car size={14} className="text-gray-400 group-hover:text-[#E8003D]" />
                            <span className="text-sm font-semibold text-[#1E3A5F] group-hover:text-[#E8003D]">
                              {v.make} {v.model} ({v.year})
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 ml-5">🔑 {v.registration_number} · Valeur : {v.market_value} DT</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : msg.isContractSelector && msg.contracts ? (
                  /* Sélecteur de contrats */
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#1E3A5F] flex items-center justify-center shrink-0"><Bot size={13} className="text-white" /></div>
                      <div className="bg-white rounded-2xl rounded-tl-none px-3 py-2 shadow-sm border border-gray-100 max-w-[82%]">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}{msg.isTyping && <span className="inline-block w-px h-3.5 bg-gray-500 animate-pulse align-middle ml-0.5" />}</p>
                        <p className="text-xs text-gray-400 mt-1">{fmt(msg.timestamp)}</p>
                      </div>
                    </div>
                    <div className="ml-9 space-y-2">
                      {msg.contracts.map(c => (
                        <button key={c.contract_number} onClick={() => selectContract(c)}
                          className="w-full text-left bg-white border border-gray-200 hover:border-[#E8003D] hover:bg-red-50 rounded-xl px-3 py-2.5 transition-all group">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-[#1E3A5F] group-hover:text-[#E8003D]">{c.contract_number}</span>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{c.status}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">📦 {c.pack_label} · Du {c.effective_date} au {c.end_date}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Message normal */
                  <div className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${msg.role === 'user' ? 'bg-[#E8003D]' : 'bg-[#1E3A5F]'}`}>
                      {msg.role === 'user' ? (currentUser?.firstName?.charAt(0) || 'U').toUpperCase() : <Bot size={13} />}
                    </div>
                    <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#E8003D] text-white rounded-tr-none' : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none'}`}>
                      <p className="whitespace-pre-wrap break-words">{msg.content}{msg.isTyping && <span className="inline-block w-px h-3.5 bg-current animate-pulse align-middle ml-0.5" />}</p>
                      {/* Badge sinistre + estimation */}
                      {msg.status === 'completed' && msg.claimNumber && (
                        <div className={`mt-2 px-2 py-1.5 rounded-lg text-xs ${msg.isCovered ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                          <div className="flex items-center gap-1 font-medium">
                            {msg.isCovered ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                            {msg.claimNumber}
                          </div>
                        </div>
                      )}
                      <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-red-200' : 'text-gray-400'}`}>{fmt(msg.timestamp)}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[#1E3A5F] flex items-center justify-center shrink-0"><Bot size={13} className="text-white" /></div>
                <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex gap-1 items-center h-4">
                    {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {(() => {
            const showGeneral = mode === 'general'
            const showSinistre = mode === 'sinistre' && selectedContract !== null
            if (!showGeneral && !showSinistre) return null
            const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && !m.isVehicleSelector && !m.isContractSelector)
            const suggestions = showGeneral
              ? GENERAL_SUGGESTIONS
              : getSinistreSuggestions(lastAssistantMsg?.content ?? '')
            return (
              <div className="px-3 pt-2 pb-1 border-t border-gray-100 bg-white shrink-0">
                <p className="text-xs text-gray-400 mb-1.5">Suggestions :</p>
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => sendSuggestion(s.text)} disabled={loading}
                      className="shrink-0 flex items-center gap-1.5 bg-gray-50 border border-gray-200 hover:border-[#E8003D] hover:bg-red-50 hover:text-[#E8003D] text-xs text-gray-600 px-3 py-1.5 rounded-full transition-all whitespace-nowrap font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                      <span>{s.icon}</span>{s.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Input */}
          <div className="px-3 py-3 bg-white border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder={inputDisabled && mode === 'sinistre' ? "Choisissez votre véhicule et contrat..." : "Posez votre question..."}
                disabled={inputDisabled}
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400 disabled:opacity-50" />
              <button onClick={sendMessage} disabled={!input.trim() || loading || inputDisabled}
                className="p-1.5 bg-[#E8003D] text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-1.5">Propulsé par Groq · llama-3.3-70b</p>
          </div>
        </div>
      )}
    </>
  )
}
