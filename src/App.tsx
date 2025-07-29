import React, { useState, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { useReservas } from './hooks/useReservas'
import { Mesa, Reserva } from './lib/supabase'
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
  const [reservaEmEdicao, setReservaEmEdicao] = useState<Reserva | null>(null)

  const {
    criarReserva,
    modificarReserva,
    cancelarReservasDoCliente,
    buscarReservasDoCliente,
    atualizarReserva, // Adicionado para o modal do dashboard
  } = useReservas(dataFiltro)

  const iniciarModoEdicao = useCallback(async (reserva: Reserva) => {
    const reservasDoCliente = await buscarReservasDoCliente(
      reserva.nome_cliente,
      reserva.telefone_cliente,
      dataFiltro
    );
    
    const mesasDoCliente = reservasDoCliente.map(r => ({
      id: r.id_mesa,
      fileira: 0, 
      posicao: 0,
      capacidade: 4,
      reserva: r
    })) as Mesa[];

    setReservaEmEdicao(reserva);
    setMesasSelecionadas(mesasDoCliente);
    setActiveTab('mesas');
    setShowModal(false);
  }, [buscarReservasDoCliente, dataFiltro]);

  const handleMesaClick = useCallback(async (mesa: Mesa) => {
    if (mesa.reserva && !reservaEmEdicao) {
      iniciarModoEdicao(mesa.reserva);
      return;
    }

    setMesasSelecionadas(prev => {
      const isSelected = prev.some(m => m.id === mesa.id);
      if (isSelected) {
        if (reservaEmEdicao && prev.length === 1) return prev;
        return prev.filter(m => m.id !== mesa.id);
      } else {
        const isOcupadaPorOutro = mesa.reserva && 
                                  reservaEmEdicao && 
                                  (mesa.reserva.nome_cliente !== reservaEmEdicao.nome_cliente || 
                                   mesa.reserva.telefone_cliente !== reservaEmEdicao.telefone_cliente);
        if (isOcupadaPorOutro) return prev;
        return [...prev, mesa];
      }
    });
  }, [reservaEmEdicao, iniciarModoEdicao]);

  const handleOpenModal = () => {
    if (mesasSelecionadas.length > 0) {
      setShowModal(true)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    if (!reservaEmEdicao) {
      setMesasSelecionadas([])
    }
  }

  const handleSaveOrUpdateReserva = async (reservaData: any) => {
    try {
      if (reservaEmEdicao) {
        await modificarReserva(reservaEmEdicao, mesasSelecionadas, reservaData);
      } else {
        const promises = mesasSelecionadas.map(mesa => 
          criarReserva({ ...reservaData, id_mesa: mesa.id })
        );
        await Promise.all(promises);
      }
      setShowModal(false);
      setMesasSelecionadas([]);
      setReservaEmEdicao(null);
    } catch (error) {
      console.error('Erro ao salvar ou atualizar reservas:', error)
    }
  }

  const handleCancelReservation = async () => {
    if (!reservaEmEdicao) return;

    if (window.confirm(`Tem certeza que deseja cancelar TODAS as reservas de ${reservaEmEdicao.nome_cliente}?`)) {
      try {
        await cancelarReservasDoCliente(
          reservaEmEdicao.nome_cliente,
          reservaEmEdicao.telefone_cliente,
          reservaEmEdicao.data_reserva
        );
        setShowModal(false);
        setMesasSelecionadas([]);
        setReservaEmEdicao(null);
      } catch (error) {
        console.error('Erro ao cancelar reserva do cliente:', error);
      }
    }
  };

  const handleClearSelection = () => {
    if (reservaEmEdicao) {
      setReservaEmEdicao(null);
      setMesasSelecionadas([]);
    } else {
      setMesasSelecionadas([]);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header dataFiltro={dataFiltro} onDataChange={setDataFiltro} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button onClick={() => setActiveTab('dashboard')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'dashboard' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              Dashboard
            </button>
            <button onClick={() => setActiveTab('mesas')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'mesas' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              Mapa de Mesas
            </button>
          </nav>
        </div>

        {activeTab === 'dashboard' ? (
          <Dashboard 
            dataFiltro={dataFiltro} 
            onEditMesas={iniciarModoEdicao}
            atualizarReserva={atualizarReserva}
          />
        ) : (
          <MapaMesas
            dataFiltro={dataFiltro}
            onMesaClick={handleMesaClick}
            mesasSelecionadas={mesasSelecionadas}
            onOpenModal={handleOpenModal}
            onClearSelection={handleClearSelection}
            reservaEmEdicao={reservaEmEdicao}
            onCancelReservation={handleCancelReservation}
          />
        )}
      </div>

      {showModal && (
        <ModalReserva
          mesas={mesasSelecionadas}
          reserva={reservaEmEdicao}
          isOpen={showModal}
          onClose={handleCloseModal}
          onSave={handleSaveOrUpdateReserva}
          dataFiltro={dataFiltro}
        />
      )}
    </div>
  )
}

export default App


