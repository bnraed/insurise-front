import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

export interface SocketNotification {
  id: string
  type: 'contract' | 'claim' | 'info'
  event: string
  title: string
  message: string
  timestamp: number
  read: boolean
}

export interface DuplicateContractPayload {
  message: string
  registrationNumber: string
  timestamp: number
}

const SOCKET_URL = window.location.hostname === 'localhost' 
  ? 'http://54.87.232.38:9092'
  : `http://${window.location.hostname}:9092`

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [notifications, setNotifications] = useState<SocketNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [duplicatePayload, setDuplicatePayload] = useState<DuplicateContractPayload | null>(null)

  const addNotification = useCallback((notif: Omit<SocketNotification, 'id' | 'read'>) => {
    const newNotif: SocketNotification = {
      ...notif,
      id: `${Date.now()}-${Math.random()}`,
      read: false,
    }
    setNotifications(prev => [newNotif, ...prev].slice(0, 50))
    setUnreadCount(prev => prev + 1)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    let socket: Socket | null = null
    let active = true

    // setTimeout(0) : en React StrictMode le cleanup annule le timer avant que
    // le socket soit créé → plus de "WebSocket closed before connection established"
    const timer = setTimeout(() => {
      if (!active) return

      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      })
      socketRef.current = socket

      socket.on('connect', () => { if (active) setConnected(true) })
      socket.on('disconnect', () => { if (active) setConnected(false) })

      // ── Contrats ──────────────────────────────────────────────
      socket.on('contract:new', (data: { contractNumber: string; timestamp: number }) => {
        if (!active) return
        addNotification({
          type: 'contract',
          event: 'contract:new',
          title: 'Nouveau contrat',
          message: `Contrat ${data.contractNumber} créé avec succès`,
          timestamp: data.timestamp,
        })
      })

      socket.on('contract:status_changed', (data: {
        contractNumber: string; oldStatus: string; newStatus: string; timestamp: number
      }) => {
        if (!active) return
        const statusLabel: Record<string, string> = {
          ACTIVE: 'Actif', SUSPENDED: 'Suspendu', CANCELLED: 'Résilié', DRAFT: 'Brouillon',
        }
        addNotification({
          type: 'contract',
          event: 'contract:status_changed',
          title: 'Statut contrat modifié',
          message: `${data.contractNumber} : ${statusLabel[data.oldStatus] ?? data.oldStatus} → ${statusLabel[data.newStatus] ?? data.newStatus}`,
          timestamp: data.timestamp,
        })
      })

      // ── Contrat en double ─────────────────────────────────────
      socket.on('contract:duplicate', (data: DuplicateContractPayload) => {
        if (!active) return
        addNotification({
          type: 'contract',
          event: 'contract:duplicate',
          title: 'Contrat en double',
          message: data.message,
          timestamp: data.timestamp,
        })
        setDuplicatePayload({ ...data })
      })

      // ── Sinistres ─────────────────────────────────────────────
      socket.on('claim:new', (data: { claimNumber: string; contractNumber: string; timestamp: number }) => {
        if (!active) return
        addNotification({
          type: 'claim',
          event: 'claim:new',
          title: 'Nouveau sinistre déclaré',
          message: `Sinistre ${data.claimNumber} sur contrat ${data.contractNumber}`,
          timestamp: data.timestamp,
        })
      })

      socket.on('claim:status_changed', (data: {
        claimNumber: string; oldStatus: string; newStatus: string; timestamp: number
      }) => {
        if (!active) return
        const statusLabel: Record<string, string> = {
          OPEN: 'Ouvert', IN_INSTRUCTION: 'En instruction',
          IN_TREATMENT: 'En traitement', CLOSED: 'Clôturé', DECLARED: 'Déclaré',
        }
        addNotification({
          type: 'claim',
          event: 'claim:status_changed',
          title: 'Statut sinistre modifié',
          message: `${data.claimNumber} : ${statusLabel[data.oldStatus] ?? data.oldStatus} → ${statusLabel[data.newStatus] ?? data.newStatus}`,
          timestamp: data.timestamp,
        })
      })
    }, 0)

    return () => {
      active = false
      clearTimeout(timer)
      if (socket) {
        socket.disconnect()
        socketRef.current = null
        setConnected(false)
      }
    }
  }, [addNotification])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  const markRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  return { connected, notifications, unreadCount, markAllRead, markRead, clearAll, duplicatePayload }
}
