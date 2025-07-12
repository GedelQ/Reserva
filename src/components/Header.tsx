import React, { useState } from 'react'
import { LogOut, Pizza, Calendar as CalendarIcon, ChevronDown, Settings } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Calendar from './Calendar'
import ConfigModal from './ConfigModal'

interface HeaderProps {
  dataFiltro: string
  onDataChange: (data: string) => void
}

const Header: React.FC<HeaderProps> = ({ dataFiltro, onDataChange }) => {
  const { signOut } = useAuth()
  const [showCalendar, setShowCalendar] = useState(false)
  const [showConfig, setShowConfig] = useState(false)

  const handleLogout = async () => {
    await signOut()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const handleDateChange = (novaData: string) => {
    onDataChange(novaData)
    setShowCalendar(false)
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
               <div className="flex items-center gap-3">
              <img
                src="https://storage.googleapis.com/msgsndr/QAD6AF09FE0rBLL9YUIk/media/686b032cf7b8398719237858.png"
                alt="Logo"
                className="h-10"
              />
              </div>
            </div>
          </div>

          {/* Seletor de Data com Calendário */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center space-x-3 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <CalendarIcon className="w-5 h-5 text-gray-600" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-800">
                    {formatDateShort(dataFiltro)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(dataFiltro).split(',')[0]}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showCalendar ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown do Calendário */}
              {showCalendar && (
                <>
                  {/* Overlay para fechar o calendário */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowCalendar(false)}
                  />
                  
                  {/* Calendário */}
                  <div className="absolute top-full right-0 mt-2 z-20 w-96">
                    <Calendar 
                      dataFiltro={dataFiltro} 
                      onDataChange={handleDateChange}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Botão de Logout */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowConfig(true)}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Configurações"
            >
              <Settings className="w-5 h-5" />
              <span>Config</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Modal de Configurações */}
      <ConfigModal 
        isOpen={showConfig} 
        onClose={() => setShowConfig(false)} 
      />
    </header>
  )
}

export default Header
