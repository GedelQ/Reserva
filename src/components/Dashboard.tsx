import React, { useState, useMemo, useEffect } from 'react'
import { Users, Calendar, TrendingUp, Clock, Edit3, MapPin, AlertTriangle, Search, X } from 'lucide-react'
import ModalReserva from './ModalReserva'
import { Reserva } from '../lib/supabase'

interface DashboardProps {
  reservas: Reserva[];
  loading: boolean;
  dataFiltro: string
  onEditMesas: (reserva: Reserva) => void;
  atualizarReserva: (id: string, reservaData: Partial<Reserva>) => Promise<Reserva | null>;
}

interface ClienteAgrupado {
  nome_cliente: string
  telefone_cliente: string
  horario_reserva: string
  observacoes: string
  reservas: Reserva[]
  mesas: number[]
  totalMesas: number
}

const LIMITE_MESAS = 30

const Dashboard: React.FC<DashboardProps> = ({ reservas, loading, dataFiltro, onEditMesas, atualizarReserva }) => {
  const [showModal, setShowModal] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteAgrupado | null>(null)
  const [termoBusca, setTermoBusca] = useState('')
  const [tipoBusca, setTipoBusca] = useState<'todos' | 'mesa' | 'cliente' | 'telefone'>('todos')

  useEffect(() => {
    // Limpa os dados do cliente selecionado APÓS o modal fechar
    if (!showModal) {
      const timer = setTimeout(() => {
        setClienteSelecionado(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [showModal]);

  const clientesAgrupados = useMemo(() => {
    const grupos: Record<string, ClienteAgrupado> = {}
    reservas.forEach(reserva => {
      const chave = `${reserva.nome_cliente}-${reserva.telefone_cliente}`
      if (!grupos[chave]) {
        grupos[chave] = { nome_cliente: reserva.nome_cliente, telefone_cliente: reserva.telefone_cliente, horario_reserva: reserva.horario_reserva, observacoes: reserva.observacoes, reservas: [], mesas: [], totalMesas: 0 }
      }
      grupos[chave].reservas.push(reserva)
      grupos[chave].mesas.push(reserva.id_mesa)
      grupos[chave].totalMesas++
    })
    return Object.values(grupos).sort((a, b) => a.horario_reserva.localeCompare(b.horario_reserva))
  }, [reservas])

  const clientesFiltrados = useMemo(() => {
    if (!termoBusca.trim()) return clientesAgrupados
    const termo = termoBusca.toLowerCase().trim()
    return clientesAgrupados.filter(cliente => {
      switch (tipoBusca) {
        case 'mesa':
          const numeroMesa = parseInt(termo); return !isNaN(numeroMesa) && cliente.mesas.includes(numeroMesa)
        case 'cliente':
          return cliente.nome_cliente.toLowerCase().includes(termo)
        case 'telefone':
          return cliente.telefone_cliente.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
        default:
          const numMesa = parseInt(termo); return (!isNaN(numMesa) && cliente.mesas.includes(numMesa)) || cliente.nome_cliente.toLowerCase().includes(termo) || cliente.telefone_cliente.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
      }
    })
  }, [clientesAgrupados, termoBusca, tipoBusca])

  const totalReservas = reservas.length
  const totalClientes = reservas.reduce((acc) => acc + 4, 0)
  const taxaOcupacao = Math.round((totalReservas / LIMITE_MESAS) * 100)
  const mesasDisponiveis = LIMITE_MESAS - totalReservas
  const atingiuLimite = totalReservas >= LIMITE_MESAS

  const handleEditarCliente = (cliente: ClienteAgrupado) => {
    setClienteSelecionado(cliente)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  const handleUpdateDetails = async (reservaData: Partial<Reserva>) => {
    if (!clienteSelecionado) return;
    const { nome_cliente, telefone_cliente, observacoes } = reservaData;
    for (const reserva of clienteSelecionado.reservas) {
      await atualizarReserva(reserva.id, { nome_cliente, telefone_cliente, observacoes });
    }
  };

  const handleEditMesasClick = () => {
    if (clienteSelecionado) {
      onEditMesas(clienteSelecionado.reservas[0]);
      handleCloseModal();
    }
  };

  const limparBusca = () => {
    setTermoBusca('')
    setTipoBusca('todos')
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm"><div className="h-12 bg-gray-200 rounded mb-4"></div><div className="h-8 bg-gray-200 rounded mb-2"></div><div className="h-4 bg-gray-200 rounded w-1/2"></div></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {atingiuLimite && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="text-sm"><p className="font-medium text-red-800">Limite de Reservas Atingido</p><p className="text-red-700 mt-1">O limite máximo de <strong>{LIMITE_MESAS} mesas</strong> para reservas foi atingido.</p></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"><div className="flex items-center justify-between"><div className="flex items-center space-x-3"><div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center"><Calendar className="w-6 h-6 text-red-600" /></div><div><p className="text-sm text-gray-600">Reservas Ativas</p><p className="text-2xl font-bold text-gray-800">{totalReservas}<span className="text-sm font-normal text-gray-500">/{LIMITE_MESAS}</span></p></div></div></div></div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"><div className="flex items-center justify-between"><div className="flex items-center space-x-3"><div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center"><Users className="w-6 h-6 text-yellow-600" /></div><div><p className="text-sm text-gray-600">Clientes Esperados</p><p className="text-2xl font-bold text-gray-800">{totalClientes}</p></div></div></div></div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"><div className="flex items-center justify-between"><div className="flex items-center space-x-3"><div className={`w-12 h-12 rounded-lg flex items-center justify-center ${taxaOcupacao >= 90 ? 'bg-red-100' : taxaOcupacao >= 70 ? 'bg-yellow-100' : 'bg-green-100'}`}><TrendingUp className={`w-6 h-6 ${taxaOcupacao >= 90 ? 'text-red-600' : taxaOcupacao >= 70 ? 'text-yellow-600' : 'text-green-600'}`} /></div><div><p className="text-sm text-gray-600">Taxa de Ocupação</p><p className={`text-2xl font-bold ${taxaOcupacao >= 90 ? 'text-red-600' : taxaOcupacao >= 70 ? 'text-yellow-600' : 'text-green-600'}`}>{taxaOcupacao}%</p></div></div></div></div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"><div className="flex items-center justify-between"><div className="flex items-center space-x-3"><div className={`w-12 h-12 rounded-lg flex items-center justify-center ${mesasDisponiveis === 0 ? 'bg-red-100' : mesasDisponiveis <= 5 ? 'bg-yellow-100' : 'bg-blue-100'}`}><Clock className={`w-6 h-6 ${mesasDisponiveis === 0 ? 'text-red-600' : mesasDisponiveis <= 5 ? 'text-yellow-600' : 'text-blue-600'}`} /></div><div><p className="text-sm text-gray-600">Mesas Disponíveis</p><p className={`text-2xl font-bold ${mesasDisponiveis === 0 ? 'text-red-600' : mesasDisponiveis <= 5 ? 'text-yellow-600' : 'text-blue-600'}`}>{mesasDisponiveis}</p></div></div></div></div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-800">Buscar Reservas</h3>{termoBusca && (<button onClick={limparBusca} className="text-sm text-gray-500 hover:text-red-600 transition-colors flex items-center space-x-1"><X className="w-4 h-4" /><span>Limpar busca</span></button>)}</div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="sm:w-48"><select value={tipoBusca} onChange={(e) => setTipoBusca(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"><option value="todos">Buscar em tudo</option><option value="mesa">Número da mesa</option><option value="cliente">Nome do cliente</option><option value="telefone">Telefone</option></select></div>
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} placeholder={tipoBusca === 'mesa' ? 'Digite o número da mesa' : tipoBusca === 'cliente' ? 'Digite o nome' : tipoBusca === 'telefone' ? 'Digite o telefone' : 'Digite para buscar...'} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm" /></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-gray-800">Reservas do Dia</h2><div className="text-sm text-gray-600">{clientesFiltrados.length} {clientesFiltrados.length === 1 ? 'cliente' : 'clientes'}</div></div></div>
        <div className="divide-y divide-gray-100">
          {clientesFiltrados.length > 0 ? (
            clientesFiltrados.map((cliente) => (
              <div key={`${cliente.nome_cliente}-${cliente.telefone_cliente}`} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center"><span className="text-red-600 font-semibold text-sm">{cliente.totalMesas}</span></div>
                    <div>
                      <h3 className="font-medium text-gray-800">{cliente.nome_cliente}</h3>
                      <p className="text-sm text-gray-600">{cliente.telefone_cliente}</p>
                      <p className="text-xs text-gray-500">Mesas: {cliente.mesas.join(', ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <p className="font-medium text-gray-800">{cliente.horario_reserva}</p>
                    <button onClick={() => handleEditarCliente(cliente)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Edit3 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500"><Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-lg font-medium">Nenhuma reserva para esta data</p></div>
          )}
        </div>
      </div>

      {showModal && clienteSelecionado && (
        <ModalReserva
          mesas={clienteSelecionado.reservas.map(r => ({ id: r.id_mesa, fileira: 0, posicao: 0, capacidade: 4 }))}
          reserva={clienteSelecionado.reservas[0]}
          isOpen={showModal}
          onClose={handleCloseModal}
          onSave={handleUpdateDetails}
          onEditMesas={handleEditMesasClick}
          dataFiltro={dataFiltro}
          isDashboardMode={true}
        />
      )}
    </div>
  )
}

export default Dashboard

