import React, { useMemo, useState, useEffect } from 'react'
import { generateMesasLayout, type MesaLayout, type Reserva } from '../lib/supabase'
import { Plus, X, AlertTriangle, Edit, Trash2, CheckCircle } from 'lucide-react'

interface Mesa extends MesaLayout {
  status: 'disponivel' | 'ocupada' | 'selecionada' | 'em-edicao'
  reserva?: any
}

interface MapaMesasProps {
  reservas: Reserva[];
  loading: boolean;
  dataFiltro: string
  onMesaClick: (mesa: Mesa) => void
  mesasSelecionadas: Mesa[]
  onOpenModal: () => void
  onClearSelection: () => void
  reservaEmEdicao: Reserva | null
  onCancelReservation: (reserva: Reserva) => void
  message: { type: 'success' | 'error', text: string } | null;
  clearMessage: () => void;
}

const LIMITE_MESAS = 30

// Componente Skeleton para o Mapa de Mesas
const MapaSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
    <div className="mb-6">
      <div className="h-7 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-2">
          <div className="w-12 h-6 bg-gray-200 rounded"></div>
          <div className="flex flex-wrap gap-2">
            {[...Array(8)].map((_, j) => (
              <div key={j} className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
    <div className="mt-6 pt-4 border-t border-gray-200">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i}><div className="h-8 bg-gray-200 rounded mb-2"></div><div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div></div>
        ))}
      </div>
    </div>
  </div>
);

const MapaMesas: React.FC<MapaMesasProps> = ({ 
  reservas,
  loading,
  dataFiltro,
  onMesaClick, 
  mesasSelecionadas,
  onOpenModal,
  onClearSelection,
  reservaEmEdicao,
  onCancelReservation,
  message,
  clearMessage
}) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        clearMessage();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, clearMessage]);

  const mesas = useMemo(() => {
    const mesasLayout = generateMesasLayout()
    const idsMesasSelecionadas = new Set(mesasSelecionadas.map(m => m.id));

    return mesasLayout.map(mesa => {
      const reserva = reservas.find(r => r.id_mesa === mesa.id)
      let status: Mesa['status'] = 'disponivel';

      const isMesaDoClienteEmEdicao = reserva &&
                                      reservaEmEdicao &&
                                      reserva.nome_cliente === reservaEmEdicao.nome_cliente &&
                                      reserva.telefone_cliente === reservaEmEdicao.telefone_cliente;

      if (reservaEmEdicao) {
        if (idsMesasSelecionadas.has(mesa.id)) {
          status = 'em-edicao';
        } else if (isMesaDoClienteEmEdicao) {
          status = 'disponivel'; 
        } else if (reserva && reserva.status === 'ativa') {
        status = 'ocupada';
        }
      } else {
        if (reserva && reserva.status === 'ativa') {
          status = 'ocupada'
        }
        if (idsMesasSelecionadas.has(mesa.id)) {
          status = 'selecionada'
        }
      }

      return {
        ...mesa,
        status,
        reserva
      } as Mesa
    })
  }, [reservas, mesasSelecionadas, reservaEmEdicao])

  const totalReservas = reservas.length
  const mesasDisponiveis = LIMITE_MESAS - totalReservas
  const atingiuLimite = totalReservas >= LIMITE_MESAS
  const proximoDoLimite = !atingiuLimite && (totalReservas >= LIMITE_MESAS - 5)
  const mesasQuePodemSerSelecionadas = Math.max(0, mesasDisponiveis - mesasSelecionadas.length)

  const podeSelecionar = (mesa: Mesa) => {
    const isMesaDoClienteEmEdicao = mesa.reserva &&
                                    reservaEmEdicao &&
                                    mesa.reserva.nome_cliente === reservaEmEdicao.nome_cliente &&
                                    mesa.reserva.telefone_cliente === reservaEmEdicao.telefone_cliente;

    if (reservaEmEdicao) {
      return mesa.status === 'disponivel' || mesa.status === 'em-edicao' || isMesaDoClienteEmEdicao;
    }
    
    if (mesasSelecionadas.find(m => m.id === mesa.id)) return true;
    if (mesa.reserva && mesa.reserva.status === 'ativa') return true;
    if (atingiuLimite) return false;
    return (totalReservas + mesasSelecionadas.length) < LIMITE_MESAS;
  }

  const getStatusColor = (mesa: Mesa) => {
    switch (mesa.status) {
      case 'disponivel':
        return podeSelecionar(mesa) ? 'bg-green-500 hover:bg-green-600 border-green-600' : 'bg-gray-300 border-gray-400 cursor-not-allowed opacity-50';
      case 'ocupada':
        return 'bg-red-500 border-red-600 cursor-not-allowed opacity-60';
      case 'selecionada':
        return 'bg-yellow-500 border-yellow-600';
      case 'em-edicao':
        return 'bg-blue-500 border-blue-600 ring-2 ring-blue-300';
      default:
        return 'bg-gray-300 border-gray-400';
    }
  }

  const mesasPorFileira = mesas.reduce((acc, mesa) => {
    if (!acc[mesa.fileira]) acc[mesa.fileira] = [];
    acc[mesa.fileira].push(mesa);
    return acc;
  }, {} as Record<number, Mesa[]>);

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start space-x-2">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      {reservaEmEdicao && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 shadow-lg animate-pulse-slow">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-blue-800">Modo de Edição</h3>
              <p className="text-sm text-blue-700 truncate">Editando reserva de <strong>{reservaEmEdicao.nome_cliente}</strong>.</p>
              <p className="text-sm text-blue-600 font-medium mt-1">Mesas: {mesasSelecionadas.map(m => m.id).join(', ')}</p>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <button onClick={onClearSelection} className="px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 bg-gray-200 text-gray-700 hover:bg-gray-300"><X className="w-4 h-4" /><span>Cancelar Edição</span></button>
              <button onClick={() => onCancelReservation(reservaEmEdicao!)} className="px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 bg-red-600 text-white hover:bg-red-700"><Trash2 className="w-4 h-4" /><span>Cancelar Reserva</span></button>
              <button onClick={onOpenModal} className="px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 bg-blue-600 text-white hover:bg-blue-700"><Edit className="w-4 h-4" /><span>Confirmar</span></button>
            </div>
          </div>
        </div>
      )}

      {loading ? <MapaSkeleton /> : (
        <>
          {!reservaEmEdicao && (
            <>
              {(atingiuLimite || proximoDoLimite) && (
                <div className={`border rounded-xl p-4 ${ atingiuLimite ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200' }`}>
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className={`w-5 h-5 mt-0.5 ${ atingiuLimite ? 'text-red-600' : 'text-amber-600' }`} />
                    <div className="text-sm">
                      {atingiuLimite ? (
                        <><p className="font-medium text-red-800">Limite de Reservas Atingido</p><p className="text-red-700 mt-1">O limite máximo de <strong>{LIMITE_MESAS} mesas</strong> foi atingido.</p></>
                      ) : (
                        <><p className="font-medium text-amber-800">Próximo do Limite</p><p className="text-amber-700 mt-1">Restam apenas <strong>{mesasDisponiveis} mesas</strong> disponíveis.</p></>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {mesasSelecionadas.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center"><span className="text-white text-xs font-bold">{mesasSelecionadas.length}</span></div>
                        <span className="font-medium text-yellow-800">{mesasSelecionadas.length} {mesasSelecionadas.length === 1 ? 'mesa selecionada' : 'mesas selecionadas'}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={onOpenModal} className="px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 bg-red-600 text-white hover:bg-red-700">
                        <Plus className="w-4 h-4" />
                        <span>Criar Reserva</span>
                      </button>
                      <button onClick={onClearSelection} className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-gray-800">Mapa do Salão</h2>
                <div className="text-sm text-gray-600"><span className="font-medium">{totalReservas}/{LIMITE_MESAS}</span> mesas reservadas</div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm mt-2">
                <div className="flex items-center space-x-2"><div className="w-4 h-4 bg-green-500 rounded border border-green-600"></div><span>Disponível</span></div>
                <div className="flex items-center space-x-2"><div className="w-4 h-4 bg-red-500 rounded border border-red-600 opacity-60"></div><span>Ocupada</span></div>
                <div className="flex items-center space-x-2"><div className="w-4 h-4 bg-yellow-500 rounded border border-yellow-600"></div><span>Selecionada</span></div>
                <div className="flex items-center space-x-2"><div className="w-4 h-4 bg-blue-500 rounded border border-blue-600"></div><span>Em Edição</span></div>
              </div>

              <div className="mt-3 text-sm text-gray-600">
                <p><strong>Dica:</strong> {reservaEmEdicao ? 'Adicione ou remova mesas da reserva atual.' : 'Clique em mesas disponíveis para selecionar ou em mesas ocupadas para editar.'}</p>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(mesasPorFileira).map(([fileira, mesasFileira]) => (
                <div key={fileira} className="flex items-center space-x-2">
                  <div className="w-12 text-center"><span className="text-sm font-medium text-gray-600">F{fileira}</span></div>
                  <div className="flex flex-wrap gap-2">
                    {mesasFileira.map((mesa) => (
                      <button
                        key={mesa.id}
                        onClick={() => onMesaClick(mesa)}
                        disabled={!podeSelecionar(mesa)}
                        className={`w-10 h-10 rounded-lg border-2 text-white text-sm font-medium transition-all duration-200 transform hover:scale-105 ${getStatusColor(mesa)}`}
                        title={
                          mesa.status === 'em-edicao' ? `Mesa ${mesa.id} - Clique para remover da reserva` :
                          mesa.status === 'disponivel' && reservaEmEdicao ? `Mesa ${mesa.id} - Clique para adicionar/remover`:
                          mesa.status === 'disponivel' ? `Mesa ${mesa.id} - Clique para selecionar` :
                          mesa.reserva ? `Mesa ${mesa.id} - ${mesa.reserva.nome_cliente}` :
                          `Mesa ${mesa.id}`
                        }
                      >
                        {mesa.id}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div><p className="text-2xl font-bold text-green-600">{mesasDisponiveis}</p><p className="text-sm text-gray-600">Disponíveis</p></div>
                <div><p className="text-2xl font-bold text-red-600">{totalReservas}</p><p className="text-sm text-gray-600">Reservadas</p></div>
                <div><p className="text-2xl font-bold text-yellow-600">{mesasSelecionadas.length}</p><p className="text-sm text-gray-600">Selecionadas</p></div>
                <div><p className="text-2xl font-bold text-blue-600">{atingiuLimite ? 0 : mesasQuePodemSerSelecionadas}</p><p className="text-sm text-gray-600">Podem Selecionar</p></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default MapaMesas
