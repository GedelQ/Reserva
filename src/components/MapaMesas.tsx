import React from 'react'
import { generateMesasLayout, type MesaLayout } from '../lib/supabase'
import { useReservas } from '../hooks/useReservas'
import { Plus, X, AlertTriangle } from 'lucide-react'

// Redefinir Mesa para compatibilidade
interface Mesa extends MesaLayout {
  status: 'disponivel' | 'ocupada' | 'selecionada'
  reserva?: any
}

interface MapaMesasProps {
  dataFiltro: string
  onMesaClick: (mesa: Mesa) => void
  mesasSelecionadas: Mesa[]
  onOpenModal: () => void
  onClearSelection: () => void
}

const LIMITE_MESAS = 30

const MapaMesas: React.FC<MapaMesasProps> = ({ 
  dataFiltro, 
  onMesaClick, 
  mesasSelecionadas,
  onOpenModal,
  onClearSelection
}) => {
  const { reservas } = useReservas(dataFiltro)
  
  // Gerar layout das mesas e aplicar status baseado nas reservas
  const mesas = React.useMemo(() => {
    const mesasLayout = generateMesasLayout()
    
    return mesasLayout.map(mesa => {
      const reserva = reservas.find(r => r.id_mesa === mesa.id)
      let status: 'disponivel' | 'ocupada' | 'selecionada' = 'disponivel'
      
      if (reserva) {
        status = 'ocupada'
      }
      
      if (mesasSelecionadas.find(m => m.id === mesa.id)) {
        status = 'selecionada'
      }

      return {
        ...mesa,
        status,
        reserva
      } as Mesa
    })
  }, [reservas, mesasSelecionadas])

  // Calcular limites
  const totalReservas = reservas.length
  const mesasDisponiveis = LIMITE_MESAS - totalReservas
  const atingiuLimite = totalReservas >= LIMITE_MESAS
  const proximoDoLimite = totalReservas >= LIMITE_MESAS - 5

  // Verificar se pode selecionar mais mesas
  const podeSelecionar = (mesa: Mesa) => {
    // Se a mesa já está selecionada, sempre pode desselecionar
    if (mesasSelecionadas.find(m => m.id === mesa.id)) {
      return true
    }
    
    // Se a mesa está ocupada, SEMPRE pode clicar para editar (nova funcionalidade)
    if (mesa.reserva) {
      return true
    }
    
    // Se atingiu o limite geral, não pode selecionar mesas disponíveis
    if (atingiuLimite) {
      return false
    }
    
    // Se selecionar esta mesa ultrapassaria o limite, não pode selecionar
    const totalAposSelecao = totalReservas + mesasSelecionadas.length + 1
    if (totalAposSelecao > LIMITE_MESAS) {
      return false
    }
    
    return true
  }

  // Agrupar mesas por fileira
  const mesasPorFileira = mesas.reduce((acc, mesa) => {
    if (!acc[mesa.fileira]) {
      acc[mesa.fileira] = []
    }
    acc[mesa.fileira].push(mesa)
    return acc
  }, {} as Record<number, Mesa[]>)

  const getStatusColor = (mesa: Mesa) => {
    const status = mesa.status
    const podeSelecionarMesa = podeSelecionar(mesa)
    
    switch (status) {
      case 'disponivel':
        if (!podeSelecionarMesa) {
          return 'bg-gray-300 border-gray-400 cursor-not-allowed opacity-50'
        }
        return 'bg-green-500 hover:bg-green-600 border-green-600'
      case 'ocupada':
        // Mesas ocupadas sempre podem ser clicadas para editar
        return 'bg-red-500 hover:bg-red-600 border-red-600 cursor-pointer'
      case 'selecionada':
        return 'bg-yellow-500 border-yellow-600'
      default:
        return 'bg-gray-300 border-gray-400'
    }
  }

  const handleMesaClick = (mesa: Mesa) => {
    // Se a mesa está ocupada, sempre permitir clique para editar
    if (mesa.reserva) {
      onMesaClick(mesa)
      return
    }
    
    // Para mesas disponíveis, verificar se pode selecionar
    if (!podeSelecionar(mesa)) {
      return
    }
    onMesaClick(mesa)
  }

  const podeAbrirModal = mesasSelecionadas.length > 0

  // Calcular quantas mesas ainda podem ser selecionadas
  const mesasQuePodemSerSelecionadas = Math.max(0, mesasDisponiveis - mesasSelecionadas.length)

  return (
    <div className="space-y-6">
      {/* Aviso sobre limite de mesas */}
      {proximoDoLimite && (
        <div className={`border rounded-xl p-4 ${
          atingiuLimite 
            ? 'bg-red-50 border-red-200' 
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start space-x-2">
            <AlertTriangle className={`w-5 h-5 mt-0.5 ${
              atingiuLimite ? 'text-red-600' : 'text-amber-600'
            }`} />
            <div className="text-sm">
              {atingiuLimite ? (
                <>
                  <p className="font-medium text-red-800">Limite de Reservas Atingido</p>
                  <p className="text-red-700 mt-1">
                    O limite máximo de <strong>{LIMITE_MESAS} mesas</strong> para reservas foi atingido. 
                    <br />
                    <strong>💡 Dica:</strong> Você ainda pode clicar nas mesas ocupadas (vermelhas) para editar ou cancelar reservas existentes.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-amber-800">Próximo do Limite</p>
                  <p className="text-amber-700 mt-1">
                    Restam apenas <strong>{mesasDisponiveis} mesas</strong> disponíveis para reserva 
                    (limite: {LIMITE_MESAS} mesas). Você pode selecionar até <strong>{mesasQuePodemSerSelecionadas}</strong> mesas adicionais.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Aviso quando há mesas selecionadas mas está próximo do limite */}
      {mesasSelecionadas.length > 0 && mesasQuePodemSerSelecionadas === 0 && !atingiuLimite && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">Limite de Seleção Atingido</p>
              <p className="text-blue-700 mt-1">
                Você selecionou o máximo de mesas possível para esta data. 
                Com as <strong>{mesasSelecionadas.length} mesas selecionadas</strong>, você atingirá o limite de {LIMITE_MESAS} mesas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Painel de Seleção Múltipla */}
      {mesasSelecionadas.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{mesasSelecionadas.length}</span>
                </div>
                <span className="font-medium text-yellow-800">
                  {mesasSelecionadas.length === 1 
                    ? `Mesa ${mesasSelecionadas[0].id} selecionada`
                    : `${mesasSelecionadas.length} mesas selecionadas`
                  }
                </span>
              </div>
              <div className="text-sm text-yellow-700">
                Mesas: {mesasSelecionadas.map(m => m.id).join(', ')}
              </div>
              {mesasQuePodemSerSelecionadas > 0 && (
                <div className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                  Pode selecionar mais {mesasQuePodemSerSelecionadas} mesa{mesasQuePodemSerSelecionadas !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenModal}
                disabled={!podeAbrirModal}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  podeAbrirModal
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>
                  {mesasSelecionadas[0]?.reserva ? 'Editar Reserva' : 'Criar Reserva'}
                </span>
              </button>
              <button
                onClick={onClearSelection}
                className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-800">Mapa do Salão</h2>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{totalReservas}/{LIMITE_MESAS}</span> mesas reservadas
            </div>
          </div>
          
          {/* Legenda */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded border border-green-600"></div>
              <span className="text-gray-600">Disponível</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded border border-red-600"></div>
              <span className="text-gray-600">Ocupada (clique para editar)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded border border-yellow-600"></div>
              <span className="text-gray-600">Selecionada</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-300 rounded border border-gray-400 opacity-50"></div>
              <span className="text-gray-600">Não selecionável</span>
            </div>
          </div>

          {/* Instruções */}
          <div className="mt-3 text-sm text-gray-600">
            <p>
              💡 <strong>Dica:</strong> {atingiuLimite 
                ? 'Limite atingido, mas você pode clicar nas mesas ocupadas (vermelhas) para editar ou cancelar reservas.'
                : mesasQuePodemSerSelecionadas > 0
                ? `Você pode selecionar até ${mesasQuePodemSerSelecionadas} mesa${mesasQuePodemSerSelecionadas !== 1 ? 's' : ''} adicional${mesasQuePodemSerSelecionadas !== 1 ? 'is' : ''}.`
                : mesasSelecionadas.length > 0
                ? 'Você atingiu o limite de seleção para esta data.'
                : `Clique em mesas disponíveis para selecioná-las ou em mesas ocupadas para editá-las. Limite: ${LIMITE_MESAS} mesas por dia.`
              }
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(mesasPorFileira).map(([fileira, mesasFileira]) => (
            <div key={fileira} className="flex items-center space-x-2">
              <div className="w-12 text-center">
                <span className="text-sm font-medium text-gray-600">F{fileira}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {mesasFileira.map((mesa) => {
                  const podeSelecionarMesa = podeSelecionar(mesa)
                  
                  return (
                    <button
                      key={mesa.id}
                      onClick={() => handleMesaClick(mesa)}
                      disabled={!podeSelecionarMesa && mesa.status !== 'selecionada' && !mesa.reserva}
                      className={`
                        w-10 h-10 rounded-lg border-2 text-white text-sm font-medium
                        transition-all duration-200 transform
                        ${getStatusColor(mesa)}
                        ${mesa.status === 'selecionada' ? 'ring-2 ring-yellow-300' : ''}
                        ${podeSelecionarMesa || mesa.status === 'selecionada' || mesa.reserva ? 'hover:scale-105' : 'hover:scale-100'}
                      `}
                      title={
                        mesa.reserva 
                          ? `Mesa ${mesa.id} - ${mesa.reserva.nome_cliente} (${mesa.reserva.horario_reserva}) - Clique para editar`
                          : mesa.status === 'selecionada'
                          ? `Mesa ${mesa.id} - Selecionada (clique para desselecionar)`
                          : !podeSelecionarMesa && mesa.status === 'disponivel'
                          ? `Mesa ${mesa.id} - Não selecionável (limite seria ultrapassado)`
                          : `Mesa ${mesa.id} - Disponível (clique para selecionar)`
                      }
                    >
                      {mesa.id}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Estatísticas */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">
                {mesasDisponiveis}
              </p>
              <p className="text-sm text-gray-600">Disponíveis</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {totalReservas}
              </p>
              <p className="text-sm text-gray-600">Reservadas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {mesasSelecionadas.length}
              </p>
              <p className="text-sm text-gray-600">Selecionadas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {atingiuLimite ? 0 : mesasQuePodemSerSelecionadas}
              </p>
              <p className="text-sm text-gray-600">Podem Selecionar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapaMesas