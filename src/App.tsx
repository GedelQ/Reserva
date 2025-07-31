import React, { useState, useCallback, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { useReservas } from './hooks/useReservas'
import { Mesa, Reserva } from './lib/supabase'
import Login from './components/Login'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import MapaMesas from './components/MapaMesas'
import ModalReserva from './components/ModalReserva'
import ConfirmModal from './components/ConfirmModal'

function App() {
  const { user } = useAuth()
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0])
  const [mesasSelecionadas, setMesasSelecionadas] = useState<Mesa[]>([])
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mesas'>('dashboard')
  const [reservaEmEdicao, setReservaEmEdicao] = useState<Reserva | null>(null)

  const {
    reservas,
    loading,
    criarReserva,
    modificarReserva,
    cancelarReservasDoCliente,
    buscarReservasDoCliente,
    atualizarReserva,
  } = useReservas(dataFiltro)

  useEffect(() => {
    if (!showModal) {
      const timer = setTimeout(() => {
        setReservaEmEdicao(null);
        setMesasSelecionadas([]);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [showModal]);

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
    // Se a mesa tem uma reserva e não estamos no modo de edição, e a reserva NÃO está cancelada,
    // então inicia o modo de edição para essa reserva.
    if (mesa.reserva && !reservaEmEdicao && mesa.reserva.status !== 'cancelada') {
      iniciarModoEdicao(mesa.reserva);
      return;
    }

    setMesasSelecionadas(prev => {
      const isSelected = prev.some(m => m.id === mesa.id);
      if (isSelected) {
        
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
    } catch (error) {
      console.error('Erro ao salvar ou atualizar reservas:', error)
    }
  }

  const [showConfirmCancelModal, setShowConfirmCancelModal] = useState(false);
  const [reservaToCancel, setReservaToCancel] = useState<Reserva | null>(null);

  const handleCancelReservation = (reserva: Reserva) => {
    setReservaToCancel(reserva);
    setShowConfirmCancelModal(true);
  };

  const [mapaMessage, setMapaMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const clearMapaMessage = useCallback(() => {
    setMapaMessage(null);
  }, []);

  const confirmCancelReservation = async () => {
    if (!reservaToCancel) return;

    try {
      // Buscar todas as reservas do cliente para o dia
      const reservasDoCliente = await buscarReservasDoCliente(
        reservaToCancel.nome_cliente,
        reservaToCancel.telefone_cliente,
        reservaToCancel.data_reserva
      );

      // Atualizar o status de cada reserva para 'cancelada'
      for (const reserva of reservasDoCliente) {
        await atualizarReserva(reserva.id, { status: 'cancelada' });
      }

      setReservaEmEdicao(null);
      setMesasSelecionadas([]);
      setShowModal(false);
      setReservaToCancel(null);
      setShowConfirmCancelModal(false);
      setMapaMessage({ type: 'success', text: `Reservas de ${reservaToCancel.nome_cliente} canceladas com sucesso!` });
    } catch (error) {
      console.error('Erro ao cancelar reserva do cliente:', error);
      setMapaMessage({ type: 'error', text: 'Erro ao cancelar reservas. Tente novamente.' });
      setReservaToCancel(null);
      setShowConfirmCancelModal(false);
    }
  };

  const cancelCancelReservation = () => {
    setReservaToCancel(null);
    setShowConfirmCancelModal(false);
  };

  const handleClearSelection = () => {
    if (reservaEmEdicao) {
      setReservaEmEdicao(null);
      setMesasSelecionadas([]);
    } else {
      setMesasSelecionadas([]);
    }
  }

  if (loading && reservas.length === 0) {
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
            reservas={reservas}
            loading={loading}
            dataFiltro={dataFiltro} 
            onEditMesas={iniciarModoEdicao}
            atualizarReserva={atualizarReserva}
          />
        ) : (
          <MapaMesas
            reservas={reservas}
            loading={loading}
            dataFiltro={dataFiltro}
            onMesaClick={handleMesaClick}
            mesasSelecionadas={mesasSelecionadas}
            onOpenModal={handleOpenModal}
            onClearSelection={handleClearSelection}
            reservaEmEdicao={reservaEmEdicao}
            onCancelReservation={handleCancelReservation}
            message={mapaMessage}
            clearMessage={clearMapaMessage}
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
          isDashboardMode={false}
        />
      )}

      {showConfirmCancelModal && reservaToCancel && (
        <ConfirmModal
          isOpen={showConfirmCancelModal}
          title="Confirmar Cancelamento"
          message={`Tem certeza que deseja cancelar TODAS as reservas de ${reservaToCancel.nome_cliente}? Esta ação não pode ser desfeita.`}
          onConfirm={confirmCancelReservation}
          onCancel={cancelCancelReservation}
          confirmText="Sim, Cancelar"
          cancelText="Não, Manter"
        />
      )}
    </div>
  )
}

export default App



