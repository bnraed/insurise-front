import { useState, useRef, useEffect } from 'react'
import { X, Loader2, Bot, Send, MessageSquare } from 'lucide-react'

const RAGGENIE_API = 'http://localhost:8001'
const CONFIG_ID    = '1'
const ENV_ID       = '1'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isTyping?: boolean
}

function genUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

export default function RaggenieChat() {
  const [isOpen, setIsOpen]       = useState(false)
  const [messages, setMessages]   = useState<Message[]>([{
    id: '0', role: 'assistant',
    content: 'Bonjour ! Je suis l\'assistant IA d\'Insurise. Posez-moi vos questions sur les contrats, devis, sinistres ou clients.',
    timestamp: new Date(),
  }])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [unread, setUnread]       = useState(0)
  // contextId requis par l'API Raggenie — généré une fois par session
  const contextId = useRef<string>(genUUID())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)
  const typingIntervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set())

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }) }, [messages])
  useEffect(() => {
    if (isOpen) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100) }
  }, [isOpen])
  useEffect(() => {
    if (!isOpen) { const t = setTimeout(() => setUnread(u => u || 1), 4000); return () => clearTimeout(t) }
  }, [isOpen])

  const addMsg = (role: 'user' | 'assistant', content: string) =>
    setMessages(p => [...p, { id: Date.now().toString(), role, content, timestamp: new Date() }])

  const addMsgTyping = (content: string) => {
    const id = Date.now().toString()
    setMessages(p => [...p, { id, role: 'assistant', content: '', timestamp: new Date(), isTyping: true }])
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

  const extract = (data: any): string => {
    if (typeof data === 'string') return data
    if (data?.content && typeof data.content === 'string' && data.content.trim()) return data.content
    if (data?.message && typeof data.message === 'string' && data.message.trim()) return data.message
    if (data?.response && typeof data.response === 'string') return data.response
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      const rows = data.data
      if (rows.length === 1 && Object.keys(rows[0]).length === 1)
        return String(Object.values(rows[0])[0])
      return rows.map((r: any) =>
        Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(' | ')
      ).join('\n')
    }
    if (data?.detail) return 'Je n\'ai pas pu comprendre votre question. Reformulez-la.'
    return 'Désolé, je n\'ai pas pu traiter votre question.'
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    addMsg('user', text)
    setInput('')
    setLoading(true)
    try {
      // Format exact selon Swagger : contextId + configId + envId en query, body = { content, role }
      const url = `${RAGGENIE_API}/api/v1/query/query?contextId=${contextId.current}&configId=${CONFIG_ID}&envId=${ENV_ID}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, role: 'user' }),
      })
      const data = await res.json()
      addMsgTyping(extract(data))
      if (!isOpen) setUnread(u => u + 1)
    } catch {
      addMsgTyping('Raggenie est indisponible. Vérifiez que le serveur tourne sur le port 8001.')
    } finally { setLoading(false) }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }
  const clearChat = () => {
    typingIntervalsRef.current.forEach(iv => clearInterval(iv))
    typingIntervalsRef.current.clear()
    contextId.current = genUUID()
    setMessages([{ id: Date.now().toString(), role: 'assistant', content: 'Nouvelle conversation. Comment puis-je vous aider ?', timestamp: new Date() }])
  }
  const fmt = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

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
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col w-[390px] h-[560px] bg-white rounded-2xl border border-gray-200 overflow-hidden"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>

          <div className="flex items-center gap-3 px-4 py-3 bg-[#1E3A5F] text-white shrink-0">
            <div className="bg-[#E8003D] rounded-full p-1.5 shrink-0"><Bot size={15} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none">Assistant Insurise</p>
              <p className="text-xs text-blue-200 mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse" />
                Llama 3.2 · Ollama local
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={clearChat} title="Nouvelle conversation" className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><MessageSquare size={14} /></button>
              <button onClick={() => setIsOpen(false)} title="Fermer" className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X size={14} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${msg.role === 'user' ? 'bg-[#E8003D]' : 'bg-[#1E3A5F]'}`}>
                  {msg.role === 'user' ? 'M' : <Bot size={13} />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#E8003D] text-white rounded-tr-none' : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none'}`}>
                  <p className="whitespace-pre-wrap break-words">{msg.content}{msg.isTyping && <span className="inline-block w-px h-3.5 bg-current animate-pulse align-middle ml-0.5" />}</p>
                  <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-red-200' : 'text-gray-400'}`}>{fmt(msg.timestamp)}</p>
                </div>
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

          <div className="px-3 py-3 bg-white border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder="Posez votre question..." disabled={loading}
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400" />
              <button onClick={sendMessage} disabled={!input.trim() || loading}
                className="p-1.5 bg-[#E8003D] text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-1.5">Propulsé par Ollama · Llama 3.2</p>
          </div>
        </div>
      )}
    </>
  )
}
