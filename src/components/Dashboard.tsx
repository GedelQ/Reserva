import React, { useState } from 'react'
import { useReservas } from '../hooks/useReservas'
import { Users, Calendar, TrendingUp, Clock, Edit3, MapPin, AlertTriangle, Search, X } from 'lucide-react'
import ModalReserva from './ModalReserva'
import { Mesa, Reserva } from '../lib/supabase'

interface DashboardProps {
  dataFiltro: string
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

const Dashboard: React.FC<DashboardProps> = ({ dataFiltro }) => {
  const { 
    reservas, 
    loading, 
    atualizarReserva, 
    atualizarReservasDoCliente,
    cancelarReserva, 
    cancelarReservasDoCliente,
    buscarReservasDoCliente,
    refetch
  } = useReservas(dataFiltro)
  
  const [showModal, setShowModal] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteAgrupado | null>(null)
  const [termoBusca, setTermoBusca] = useState('')
  const [tipoBusca, setTipoBusca] = useState<'todos' | 'mesa' | 'cliente' | 'telefone'>('todos')

  // Agrupar reservas por cliente (nome + telefone)
  const clientesAgrupados = React.useMemo(() => {
    const grupos: Record<string, ClienteAgrupado> = {}
    
    reservas.forEach(reserva => {
      const chave = `${reserva.nome_cliente}-${reserva.telefone_cliente}`
      
      if (!grupos[chave]) {
        grupos[chave] = {
          nome_cliente: reserva.nome_cliente,
          telefone_cliente: reserva.telefone_cliente,
          horario_reserva: reserva.horario_reserva,
          observacoes: reserva.observacoes,
          reservas: [],
          mesas: [],
          totalMesas: 0
        }
      }
      
      grupos[chave].reservas.push(reserva)
      grupos[chave].mesas.push(reserva.id_mesa)
      grupos[chave].totalMesas++
    })
    
    // Ordenar por horário
    return Object.values(grupos).sort((a, b) => 
      a.horario_reserva.localeCompare(b.horario_reserva)
    )
  }, [reservas])

  // Filtrar clientes baseado na busca
  const clientesFiltrados = React.useMemo(() => {
    if (!termoBusca.trim()) {
      return clientesAgrupados
    }

    const termo = termoBusca.toLowerCase().trim()
    
    return clientesAgrupados.filter(cliente => {
      switch (tipoBusca) {
        case 'mesa':
          // Buscar por número da mesa
          const numeroMesa = parseInt(termo)
          if (isNaN(numeroMesa)) return false
          return cliente.mesas.includes(numeroMesa)
          
        case 'cliente':
          // Buscar por nome do cliente
          return cliente.nome_cliente.toLowerCase().includes(termo)
          
        case 'telefone':
          // Buscar por telefone (remover formatação)
          const telefoneCliente = cliente.telefone_cliente.replace(/\D/g, '')
          const termoBuscaTelefone = termo.replace(/\D/g, '')
          return telefoneCliente.includes(termoBuscaTelefone)
          
        case 'todos':
        default:
          // Buscar em todos os campos
          const numeroMesaTodos = parseInt(termo)
          const contemMesa = !isNaN(numeroMesaTodos) && cliente.mesas.includes(numeroMesaTodos)
          const contemNome = cliente.nome_cliente.toLowerCase().includes(termo)
          const telefoneClienteTodos = cliente.telefone_cliente.replace(/\D/g, '')
          const termoBuscaTelefoneTodos = termo.replace(/\D/g, '')
          const contemTelefone = telefoneClienteTodos.includes(termoBuscaTelefoneTodos)
          
          return contemMesa || contemNome || contemTelefone
      }
    })
  }, [clientesAgrupados, termoBusca, tipoBusca])

  const totalReservas = reservas.length
  const totalClientes = reservas.reduce((acc, reserva) => acc + 4, 0) // 4 pessoas por mesa
  const taxaOcupacao = Math.round((totalReservas / LIMITE_MESAS) * 100) // Baseado no limite de 30 mesas
  const mesasDisponiveis = LIMITE_MESAS - totalReservas
  const atingiuLimite = totalReservas >= LIMITE_MESAS

  const handleEditarCliente = (cliente: ClienteAgrupado) => {
    setClienteSelecionado(cliente)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setClienteSelecionado(null)
  }

  const handleUpdateReserva = async (id: string, reservaData: any) => {
    try {
      // Sempre usar atualizarReserva - o modal já determina qual reserva específica atualizar
      await atualizarReserva(id, reservaData)
      handleCloseModal()
    } catch (error) {
      console.error('Erro ao atualizar reserva:', error)
    }
  }

  const handleDeleteReserva = async (id: string) => {
    try {
      // Cancelar a reserva específica pelo ID
      await cancelarReserva(id)
  const mesasParaModal: Mesa[] = clienteSelecionado ? 
    clienteSelecionado.mesas.map(mesaId => ({
      id: mesaId,
      fileira: Math.ceil(mesaId / (mesaId <= 48 ? 8 : 10)),
      posicao: mesaId <= 48 ? ((mesaId - 1) % 8) + 1 : ((mesaId - 49) % 10) + 1,
      capacidade: 4,
      status: 'ocupada' as const,
      reserva: clienteSelecionado.reservas[0] // Usar a primeira reserva como referência
    })) : []

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Aviso sobre limite */}
      {atingiuLimite && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-red-800">Limite de Reservas Atingido</p>
              <p className="text-red-700 mt-1">
                O limite máximo de <strong>{LIMITE_MESAS} mesas</strong> para reservas foi atingido. 
                Para criar novas reservas, é necessário cancelar algumas existentes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Reservas Ativas</p>
                <p className="text-2xl font-bold text-gray-800">
                  {totalReservas}
                  <span className="text-sm font-normal text-gray-500">/{LIMITE_MESAS}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Clientes Esperados</p>
                <p className="text-2xl font-bold text-gray-800">{totalClientes}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                taxaOcupacao >= 90 ? 'bg-red-100' : taxaOcupacao >= 70 ? 'bg-yellow-100' : 'bg-green-100'
              }`}>
                <TrendingUp className={`w-6 h-6 ${
                  taxaOcupacao >= 90 ? 'text-red-600' : taxaOcupacao >= 70 ? 'text-yellow-600' : 'text-green-600'
                }`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Taxa de Ocupação</p>
                <p className={`text-2xl font-bold ${
                  taxaOcupacao >= 90 ? 'text-red-600' : taxaOcupacao >= 70 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {taxaOcupacao}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                mesasDisponiveis === 0 ? 'bg-red-100' : mesasDisponiveis <= 5 ? 'bg-yellow-100' : 'bg-blue-100'
              }`}>
                <Clock className={`w-6 h-6 ${
                  mesasDisponiveis === 0 ? 'text-red-600' : mesasDisponiveis <= 5 ? 'text-yellow-600' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Mesas Disponíveis</p>
                <p className={`text-2xl font-bold ${
                  mesasDisponiveis === 0 ? 'text-red-600' : mesasDisponiveis <= 5 ? 'text-yellow-600' : 'text-blue-600'
                }`}>
                  {mesasDisponiveis}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sistema de Busca */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Buscar Reservas</h3>
          {termoBusca && (
            <button
              onClick={limparBusca}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors flex items-center space-x-1"
            >
              <X className="w-4 h-4" />
              <span>Limpar busca</span>
            </button>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Seletor de tipo de busca */}
          <div className="sm:w-48">
            <select
              value={tipoBusca}
              onChange={(e) => setTipoBusca(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            >
              <option value="todos">Buscar em tudo</option>
              <option value="mesa">Número da mesa</option>
              <option value="cliente">Nome do cliente</option>
              <option value="telefone">Telefone</option>
            </select>
          </div>
          
          {/* Campo de busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder={
                tipoBusca === 'mesa' ? 'Digite o número da mesa (ex: 15)' :
                tipoBusca === 'cliente' ? 'Digite o nome do cliente' :
                tipoBusca === 'telefone' ? 'Digite o telefone' :
                'Digite mesa, nome ou telefone'
              }
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
        
        {/* Resultados da busca */}
        {termoBusca && (
          <div className="mt-4 text-sm text-gray-600">
            {clientesFiltrados.length === 0 ? (
              <p className="text-red-600">
                Nenhuma reserva encontrada para "{termoBusca}"
                {tipoBusca !== 'todos' && ` em ${tipoBusca === 'mesa' ? 'número da mesa' : tipoBusca === 'cliente' ? 'nome do cliente' : 'telefone'}`}
              </p>
            ) : (
              <p>
                {clientesFiltrados.length === clientesAgrupados.length ? (
                  `Mostrando todas as ${clientesAgrupados.length} reservas`
                ) : (
                  <>
                    Encontrado{clientesFiltrados.length !== 1 ? 's' : ''} <strong>{clientesFiltrados.length}</strong> resultado{clientesFiltrados.length !== 1 ? 's' : ''} 
                    {tipoBusca !== 'todos' && ` em ${tipoBusca === 'mesa' ? 'número da mesa' : tipoBusca === 'cliente' ? 'nome do cliente' : 'telefone'}`} 
                    para "{termoBusca}"
                  </>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Lista de Reservas Agrupadas por Cliente */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              {termoBusca ? 'Resultados da Busca' : 'Reservas do Dia'}
            </h2>
            <div className="text-sm text-gray-600">
              {clientesFiltrados.length} {clientesFiltrados.length === 1 ? 'cliente' : 'clientes'}
              {termoBusca && clientesFiltrados.length !== clientesAgrupados.length && (
                <span className="text-gray-400"> de {clientesAgrupados.length} total</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {clientesFiltrados.length > 0 ? (
            clientesFiltrados.map((cliente, index) => (
              <div key={`${cliente.nome_cliente}-${cliente.telefone_cliente}`} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-semibold text-sm">
                        {cliente.totalMesas}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-800">{cliente.nome_cliente}</h3>
                        {cliente.totalMesas > 1 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {cliente.totalMesas} mesas
                          </span>
                        )}
                        {/* Destacar termo de busca */}
                        {termoBusca && tipoBusca === 'mesa' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Mesa {parseInt(termoBusca)} encontrada
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{cliente.telefone_cliente}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          <span>
                            {cliente.totalMesas === 1 
                              ? `Mesa ${cliente.mesas[0]}`
                              : `Mesas: ${cliente.mesas.sort((a, b) => a - b).join(', ')}`
                            }
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Users className="w-3 h-3" />
                          <span>{cliente.totalMesas * 4} pessoas</span>
                        </div>
                      </div>
                      {cliente.observacoes && (
                        <p className="text-xs text-gray-500 mt-1 italic">"{cliente.observacoes}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-medium text-gray-800">{cliente.horario_reserva}</p>
                      <p className="text-sm text-gray-600">
                        {cliente.totalMesas === 1 ? 'Mesa' : 'Grupo'} #{termoBusca ? clientesFiltrados.indexOf(cliente) + 1 : index + 1}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEditarCliente(cliente)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={`Editar ${cliente.totalMesas === 1 ? 'reserva' : `${cliente.totalMesas} reservas`}`}
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              {termoBusca ? (
                <>
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium">Nenhum resultado encontrado</p>
                  <p className="text-sm">Tente buscar por outro termo ou limpe a busca para ver todas as reservas</p>
                </>
              ) : (
                <>
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium">Nenhuma reserva para esta data</p>
                  <p className="text-sm">As reservas aparecerão aqui quando forem criadas</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edição */}
      {clienteSelecionado && (
        <ModalReserva
          mesas={mesasParaModal}
          reserva={clienteSelecionado.reservas[0]} // Usar a primeira reserva como referência
          isOpen={showModal}
          onClose={handleCloseModal}
          onSave={() => {}} // Não usado para edição
          onUpdate={handleUpdateReserva}
          onDelete={handleDeleteReserva}
          dataFiltro={dataFiltro}
          buscarReservasDoCliente={buscarReservasDoCliente}
        />
      )}
    </div>
  )
}

export default Dashboard