'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2, ArrowLeft } from 'lucide-react'
import { appointmentAPI, Appointment } from '@/lib/api'
import { Button } from '@/components/Button'
import { PageContainer } from '@/components/PageContainer'
import { formatTime24h } from '@/lib/time'
import { getStatusBadgeClasses, getStatusLabel } from '@/lib/status'

interface SearchInputProps {
  onSelectAppointment: (appointment: Appointment) => void
  onBack: () => void
}

// Hook de debounce customizado
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function SearchInput({ onSelectAppointment, onBack }: SearchInputProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedQuery = useDebounce(query, 300)

  // Buscar sugestões quando o usuário digitar >= 2 caracteres
  useEffect(() => {
    const trimmed = debouncedQuery.trim()
    
    if (trimmed.length < 2) {
      setSuggestions([])
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    appointmentAPI
      .search(trimmed)
      .then((results: Appointment[]) => {
        setSuggestions(results)
        setSelectedIndex(-1)
        if (results.length === 0) {
          setError('Nenhuma consulta encontrada para este nome.')
        }
      })
      .catch((err: unknown) => {
        console.error('Erro na busca:', err)
        setError('Erro ao buscar consultas. Tente novamente.')
        setSuggestions([])
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [debouncedQuery])

  // Navegação por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => 
          prev < Math.min(suggestions.length - 1, 9) ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault()
        onSelectAppointment(suggestions[selectedIndex])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [suggestions, selectedIndex, onSelectAppointment])

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    setError(null)
    inputRef.current?.focus()
  }

  // Teclado digital: inserir caracteres, espaço, backspace
  const appendChar = (ch: string) => {
    setQuery((prev) => (prev + ch).slice(0, 80))
  }
  const backspace = () => {
    setQuery((prev) => prev.slice(0, -1))
  }
  const space = () => appendChar(' ')

  // Navegar sugestões via "teclas" digitais
  const selectPrev = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }
  const selectNext = () => {
    setSelectedIndex((prev) => {
      const max = Math.min(suggestions.length - 1, 9)
      return prev < max ? prev + 1 : prev
    })
  }
  const confirmSelection = () => {
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      onSelectAppointment(suggestions[selectedIndex])
    }
  }

  // Formatar hora (HH:MM)
  const formatTime = (time: string): string => formatTime24h(time)

  const showDropdown = query.trim().length >= 2 && (suggestions.length > 0 || isLoading || error)

  return (
    <PageContainer>
      <div className="w-full flex flex-col items-center gap-8">
        {/* Cabeçalho simples */}
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl text-[#D3A67F]">Digite seu nome ou CPF</h2>
          <p className="text-[#4A4A4A]/70">
            Para localizar seu agendamento por nome ou CPF
          </p>
        </div>

        {/* Campo de busca compacto */}
        <div className="w-full max-w-2xl relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Maria, João, Ana Silva..."
              className="w-full pl-12 pr-12 py-4 text-lg border border-gray-300 rounded-lg focus:border-[#D3A67F] focus:outline-none transition-colors"
              inputMode="none"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D3A67F] animate-spin" />
            )}
          </div>

          {/* Sugestões inline, sem popup */}
          {showDropdown && (
            <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-sm max-h-[360px] overflow-y-auto">
              {isLoading && suggestions.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Buscando consultas...
                </div>
              ) : error ? (
                <div className="p-6 text-center text-gray-600">{error}</div>
              ) : (
                <div>
                  {suggestions.slice(0, 10).map((appointment, index) => (
                    <button
                      key={appointment.id}
                      onClick={() => onSelectAppointment(appointment)}
                      className={`w-full p-4 text-left transition-colors border-b border-gray-100 last:border-b-0 ${
                        index === selectedIndex ? 'bg-[#F7EFE8]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-base font-semibold text-[#4A4A4A] mb-1">
                            {appointment.patient}
                          </p>
                          <div className="flex flex-wrap gap-3 text-sm text-[#4A4A4A]/80">
                            <span>📅 {new Date(appointment.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            <span>🕐 {formatTime(appointment.time)}</span>
                            <span>👨‍⚕️ {appointment.doctor}</span>
                            <span>🏥 {appointment.specialty}</span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClasses(appointment.status)}`}>
                            {getStatusLabel(appointment.status)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navegação por teclado (informativa) */}
        {suggestions.length > 0 && (
          <p className="text-sm text-[#4A4A4A]/70">
            Use as setas ↑↓ e Enter para selecionar
          </p>
        )}

        {/* Teclado digital */}
        <div className="w-full max-w-2xl select-none">
          <div className="grid grid-cols-10 gap-2 mb-2">
            {['1','2','3','4','5','6','7','8','9','0'].map((k) => (
              <button
                key={k}
                className="py-3 bg-[#F6F2EE] rounded-md text-[#4A4A4A] font-semibold hover:bg-[#EFE7DF]"
                onClick={() => appendChar(k)}
              >
                {k}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-10 gap-2 mb-2">
            {['Q','W','E','R','T','Y','U','I','O','P'].map((k) => (
              <button key={k} className="py-3 bg-[#F6F2EE] rounded-md text-[#4A4A4A] font-semibold hover:bg-[#EFE7DF]"
                onClick={() => appendChar(k)}>{k}</button>
            ))}
          </div>
          <div className="grid grid-cols-9 gap-2 mb-2">
            {['A','S','D','F','G','H','J','K','L'].map((k) => (
              <button key={k} className="py-3 bg-[#F6F2EE] rounded-md text-[#4A4A4A] font-semibold hover:bg-[#EFE7DF]"
                onClick={() => appendChar(k)}>{k}</button>
            ))}
          </div>
          <div className="grid grid-cols-9 gap-2 mb-2">
            {['Z','X','C','V','B','N','M'].map((k) => (
              <button key={k} className="py-3 bg-[#F6F2EE] rounded-md text-[#4A4A4A] font-semibold hover:bg-[#EFE7DF]"
                onClick={() => appendChar(k)}>{k}</button>
            ))}
            <button className="py-3 bg-[#F6F2EE] rounded-md text-[#4A4A4A] font-semibold hover:bg-[#EFE7DF]" onClick={space}>Espaço</button>
            <button className="py-3 bg-[#FBE7E7] rounded-md text-[#9B2C2C] font-semibold hover:bg-[#F7DADA]" onClick={backspace}>⌫</button>
          </div>

          {/* Controle de sugestões */}
          <div className="grid grid-cols-4 gap-2">
            <button className="py-3 bg-[#E8F0FE] rounded-md text-[#1A73E8] font-semibold hover:bg-[#D7E6FD]" onClick={selectPrev}>↑</button>
            <button className="py-3 bg-[#E8F0FE] rounded-md text-[#1A73E8] font-semibold hover:bg-[#D7E6FD]" onClick={selectNext}>↓</button>
            <button className="py-3 bg-[#DFF5E1] rounded-md text-[#2F8F46] font-semibold hover:bg-[#D1EFD6]" onClick={confirmSelection}>Enter</button>
            <button className="py-3 bg-[#F6F2EE] rounded-md text-[#4A4A4A] font-semibold hover:bg-[#EFE7DF]" onClick={handleClear}>Limpar</button>
          </div>
        </div>

        {/* Botão voltar padrão */}
        <div className="w-full max-w-2xl">
          <Button variant="ghost" size="lg" onClick={onBack} className="w-full">
            <div className="flex items-center justify-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </div>
          </Button>
        </div>
      </div>
    </PageContainer>
  )
}
