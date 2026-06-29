import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface DatePickerProps {
  value: string
  onChange: (val: string) => void
  className?: string
  min?: string
  max?: string
  placeholder?: string
}

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR   = ['L','M','M','J','V','S','D']

export default function DatePicker({ value, onChange, className, min, max, placeholder = 'JJ/MM/AAAA' }: DatePickerProps) {
  const parsed   = value ? new Date(value + 'T00:00:00') : null
  const [open, setOpen]         = useState(false)
  const [viewYear, setViewYear] = useState(() => parsed?.getFullYear() ?? new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => parsed?.getMonth() ?? new Date().getMonth())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (parsed) { setViewYear(parsed.getFullYear()); setViewMonth(parsed.getMonth()) }
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const minDate = min ? new Date(min + 'T00:00:00') : null
  const maxDate = max ? new Date(max + 'T00:00:00') : null

  const prevMonth = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  const nextMonth = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const selectDay = (e: React.MouseEvent, day: number) => {
    e.preventDefault(); e.stopPropagation()
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    onChange(`${viewYear}-${mm}-${dd}`)
    setOpen(false)
  }

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day)
    if (minDate && d < minDate) return true
    if (maxDate && d > maxDate) return true
    return false
  }

  const isSelected = (day: number) =>
    !!parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth && parsed.getDate() === day

  const isToday = (day: number) => {
    const t = new Date()
    return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === day
  }

  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startOffset  = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7

  const displayValue = parsed
    ? parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          readOnly
          value={displayValue}
          onClick={() => setOpen(o => !o)}
          placeholder={placeholder}
          className={`${className} cursor-pointer pr-8`}
        />
        <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>

      {open && (
        <div
          className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-64"
          onMouseDown={e => e.preventDefault()}
        >
          {/* Navigation mois */}
          <div className="flex items-center justify-between mb-3">
            <button onMouseDown={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={15} />
            </button>
            <div className="flex items-center gap-2">
              <select
                value={viewMonth}
                onChange={e => setViewMonth(Number(e.target.value))}
                onMouseDown={e => e.stopPropagation()}
                className="text-xs font-semibold text-gray-700 bg-transparent border-none outline-none cursor-pointer"
              >
                {MONTHS_FR.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select
                value={viewYear}
                onChange={e => setViewYear(Number(e.target.value))}
                onMouseDown={e => e.stopPropagation()}
                className="text-xs font-semibold text-gray-700 bg-transparent border-none outline-none cursor-pointer"
              >
                {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button onMouseDown={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_FR.map((d, i) => (
              <div key={i} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Jours */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const disabled = isDisabled(day)
              const sel      = isSelected(day)
              const today    = isToday(day)
              return (
                <button
                  key={day}
                  onMouseDown={e => { if (!disabled) selectDay(e, day) }}
                  className={`text-xs rounded-lg py-1.5 text-center transition-colors
                    ${sel ? 'bg-[#E8003D] text-white font-semibold' : ''}
                    ${!sel && today ? 'border border-[#E8003D] text-[#E8003D] font-medium' : ''}
                    ${!sel && !disabled ? 'hover:bg-red-50 hover:text-[#E8003D] text-gray-700 cursor-pointer' : ''}
                    ${disabled ? 'text-gray-300 cursor-not-allowed' : ''}
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
