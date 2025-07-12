import React, { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useReservas } from './hooks/useReservas'
import { Mesa } from './lib/supabase'
import { processWebhook, WEBHOOK_EVENTS } from './lib/webhook'
import Login from './components/Login'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import MapaMesas from './components/MapaMesas'
import ModalReserva from './components/ModalReserva'

function App() {
  const { user, loading } = useAuth()
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0])
  const [mesasSelecionadas, setMesasSelecionadas] = useState<Mesa[]>([])
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mesas'>('dashboard')

  const { 
    criarReserva, 
    atualizarReserva, 
    atualizarReservasDoCliente,
    cancelarReserva, 
    cancelarReservasDoCliente,
    buscarReservasDoCliente,
    refetch
  } = useReservas(dataFiltro)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  const handleMesaClick = (mesa: Mesa) => {
    // Se a mesa já tem reserva, abrir modal para editar
    if (mesa.reserva) {
      setMesasSelecionadas([mesa])
      setShowModal(true)
      return
    }

    // Se a mesa está selecionada, remover da seleção
    if (mesasSelecionadas.find(m => m.id === mesa.id)) {
      setMesasSelecionadas(prev => prev.filter(m => m.id !== mesa.id))
    } else {
      // Adicionar à seleção
      setMesasSelecionadas(prev => [...prev, mesa])
    }
  }

  const handleOpenModal = () => {
    if (mesasSelecionadas.length > 0) {
      setShowModal(true)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setMesasSelecionadas([])
  }

  const handleSaveReserva = async (reservaData: any) => {
    try {
      const reservasCriadas = []
      for (const mesa of mesasSelecionadas) {
        const novaReserva = await criarReserva({
          ...reservaData,
          id_mesa: mesa.id
        })
        if (novaReserva) {
          reservasCriadas.push(novaReserva)
        }
      }

      if (reservasCriadas.length > 0) {
        await processWebhook(WEBHOOK_EVENTS.RESERVA_CRIADA, reservasCriadas)
      }

      handleCloseModal()
    } catch (error) {
      console.error('Erro ao criar reservas:', error)
    }
  }

  const handleUpdateReserva = async (id: string, reservaData: any) => {
    try {
      // Buscar a reserva atual para obter os dados do cliente
      const reservaAtual = mesasSelecionadas[0]?.reserva
      
      if (reservaAtual) {
        // Buscar todas as reservas do mesmo cliente na mesma data
        const reservasDoCliente = buscarReservasDoCliente(
          reservaAtual.nome_cliente,
          reservaAtual.telefone_cliente,
          dataFiltro
        )

        // Sempre usar atualizarReserva - o modal já determina qual reserva específica atualizar
        await atualizarReserva(id, reservaData)
      }
      handleCloseModal()
    } catch (error) {
      console.error('Erro ao atualizar reserva:', error)
    }
  }

  const handleDeleteReserva = async (id: string) => {
    try {
      // Buscar a reserva atual para obter os dados do cliente
      const reservaAtual = mesasSelecionadas[0]?.reserva
      
      if (reservaAtual) {
        // Buscar todas as reservas do mesmo cliente na mesma data
        const reservasDoCliente = buscarReservasDoCliente(
          reservaAtual.nome_cliente,
          reservaAtual.telefone_cliente,
          dataFiltro
        )

        // Sempre usar cancelarReserva - o modal já determina qual reserva específica cancelar
        await cancelarReserva(id)
      }
      handleCloseModal()
    } catch (error) {
      console.error('Erro ao cancelar reserva:', error)
    }
  }

  const handleClearSelection = () => {
    setMesasSelecionadas([])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header dataFiltro={dataFiltro} onDataChange={setDataFiltro} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navegação por Abas */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('mesas')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'mesas'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Mapa de Mesas
            </button>
          </nav>
        </div>

        {/* Conteúdo */}
        {activeTab === 'dashboard' ? (
          <Dashboard dataFiltro={dataFiltro} />
        ) : (
          <MapaMesas
            dataFiltro={dataFiltro}
            onMesaClick={handleMesaClick}
            mesasSelecionadas={mesasSelecionadas}
            onOpenModal={handleOpenModal}
            onClearSelection={handleClearSelection}
          />
        )}
      </div>

      {/* Modal de Reserva */}
      <ModalReserva
        mesas={mesasSelecionadas}
        reserva={mesasSelecionadas.length === 1 ? mesasSelecionadas[0]?.reserva : undefined}
        isOpen={showModal}
        onClose={handleCloseModal}
        onSave={handleSaveReserva}
        onUpdate={handleUpdateReserva}
        onDelete={handleDeleteReserva}
        dataFiltro={dataFiltro}
        buscarReservasDoCliente={buscarReservasDoCliente}
      />
    </div>
  )
}

export default App