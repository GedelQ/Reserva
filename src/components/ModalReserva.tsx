import React, { useState, useEffect } from 'react'
import { X, User, Phone, Clock, FileText, Save, Trash2, Users, AlertTriangle, Settings, MapPin } from 'lucide-react'
import { Mesa, Reserva, TIME_SLOTS } from '../lib/supabase'

interface ModalReservaProps {
  mesas: Mesa[]
  reserva?: Reserva
  isOpen: boolean
  onClose: () => void
  onSave: (reservaData: Omit<Reserva, 'id' | 'created_at'>) => void
  onUpdate?: (id: string, reservaData: Partial<Reserva>) => void
  onDelete?: (id: string) => void
  dataFiltro: string
  buscarReservasDoCliente?: (nomeCliente: string, telefoneCliente: string, dataReserva: string) => Promise<Reserva[]>
}

const LIMITE_MESAS = 30

const ModalReserva: React.FC<ModalReservaProps> = ({
  mesas,
  reserva,
  isOpen,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  dataFiltro,
  buscarReservasDoCliente
}) => {
  const [formData, setFormData] = useState({
    nome_cliente: '',
    telefone_cliente: '',
    horario_reserva: '',
    observacoes: ''
  })
  const [loading, setLoading] = useState(false)
  const [reservasDoCliente, setReservasDoCliente] = useState<Reserva[]>([])
  const [error, setError] = useState('')
  const [modoEdicao, setModoEdicao] = useState<'todas' | 'individual'>('todas')
  const [mesaSelecionadaParaEdicao, setMesaSelecionadaParaEdicao] = useState<number | null>(null)
  const [showModoSelector, setShowModoSelector] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const loadReservaData = async () => {
      if (reserva) {
        setFormData({
          nome_cliente: reserva.nome_cliente,
          telefone_cliente: reserva.telefone_cliente,
          horario_reserva: reserva.horario_reserva,
          observacoes: reserva.observacoes || ''
        })

        // Buscar outras reservas do mesmo cliente
        if (buscarReservasDoCliente) {
          try {
            const outrasReservas = await buscarReservasDoCliente(
              reserva.nome_cliente,
              reserva.telefone_cliente,
              dataFiltro
            )
            setReservasDoCliente(outrasReservas)
            
            // Definir mesa padrão para edição individual
            if (outrasReservas.length > 1) {
              setMesaSelecionadaParaEdicao(mesas[0]?.id || outrasReservas[0]?.id_mesa || null)
            }
          } catch (error) {
            console.error('Erro ao buscar reservas do cliente:', error)
          }
        }
      } else {
        setFormData({
          nome_cliente: '',
          telefone_cliente: '',
          horario_reserva: '',
          observacoes: ''
        })
        setReservasDoCliente([])
        setMesaSelecionadaParaEdicao(null)
      }
      setError('')
      setSuccessMessage('')
      setModoEdicao('todas')
      setShowModoSelector(false)
    }
    
    loadReservaData()
  }, [reserva, buscarReservasDoCliente, dataFiltro, mesas])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      if (reserva && onUpdate) {
        if (modoEdicao === 'individual' && mesaSelecionadaParaEdicao) {
          // Encontrar a reserva específica da mesa selecionada
          const reservaEspecifica = reservasDoCliente.find(r => r.id_mesa === mesaSelecionadaParaEdicao)
          if (reservaEspecifica) {
            await onUpdate(reservaEspecifica.id, formData)
          } else {
            setError('Reserva da mesa selecionada não encontrada')
            setLoading(false)
            return
          }
        } else {
          // Modo todas - atualizar a reserva principal
          await onUpdate(reserva.id, formData)
        }
        setSuccessMessage(
          modoEdicao === 'individual' && mesaSelecionadaParaEdicao
            ? `Mesa ${mesaSelecionadaParaEdicao} atualizada com sucesso!`
            : isEditingMultipleReservations && modoEdicao === 'todas'
            ? `${reservasDoCliente.length} reservas atualizadas com sucesso!`
            : 'Reserva atualizada com sucesso!'
        )
      } else if (mesas.length > 0) {
        await onSave({
          id_mesa: mesas[0].id, // Será sobrescrito no App.tsx para cada mesa
          data_reserva: dataFiltro,
          status: 'ativa',
          ...formData
        })
        setSuccessMessage(
          isMultipleMesas 
            ? `${mesas.length} reservas criadas com sucesso!`
            : 'Reserva criada com sucesso!'
        )
      }
      
      // Aguardar um pouco para mostrar a mensagem de sucesso antes de fechar
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error: any) {
      console.error('Erro ao salvar reserva:', error)
      if (error.message && error.message.includes('LIMITE_ATINGIDO')) {
        setError(`Limite de ${LIMITE_MESAS} mesas por dia atingido. Não é possível criar mais reservas.`)
      } else {
        setError('Erro ao salvar reserva. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (modo: 'todas' | 'individual' = modoEdicao) => {
    if (reserva && onDelete) {
      setLoading(true)
      setError('')
      setSuccessMessage('')
      try {
        if (modo === 'individual' && mesaSelecionadaParaEdicao && isEditingMultipleReservations) {
          // Cancelar apenas a reserva da mesa selecionada
          const reservaEspecifica = reservasDoCliente.find(r => r.id_mesa === mesaSelecionadaParaEdicao)
          if (reservaEspecifica) {
            await onDelete(reservaEspecifica.id)
          } else {
            setError('Reserva da mesa selecionada não encontrada')
            setLoading(false)
            return
          }
        } else {
          // Cancelar todas as reservas do cliente ou reserva única
          await onDelete(reserva.id)
        }
        setSuccessMessage(
          modo === 'individual' && mesaSelecionadaParaEdicao && isEditingMultipleReservations
            ? `Reserva da mesa ${mesaSelecionadaParaEdicao} cancelada com sucesso!`
            : isEditingMultipleReservations && modo === 'todas'
            ? `${reservasDoCliente.length} reservas canceladas com sucesso!`
            : 'Reserva cancelada com sucesso!'
        )
        
        // Aguardar um pouco para mostrar a mensagem de sucesso antes de fechar
        setTimeout(() => {
          onClose()
        }, 1500)
      } catch (error) {
        console.error('Erro ao cancelar reserva:', error)
        setError('Erro ao cancelar reserva. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }
  }

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    return value
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setFormData(prev => ({ ...prev, telefone_cliente: formatted }))
  }

  if (!isOpen || mesas.length === 0) return null

  const isMultipleMesas = mesas.length > 1
  const totalPessoas = mesas.length * 4
  const isEditingMultipleReservations = reserva && reservasDoCliente.length > 1

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {reserva ? 'Editar Reserva' : 'Nova Reserva'}
            </h2>
            {isMultipleMesas ? (
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  {mesas.length} mesas selecionadas
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Users className="w-3 h-3" />
                  <span>Capacidade total: {totalPessoas} pessoas</span>
                </div>
                <p className="text-xs text-gray-500">
                  Mesas: {mesas.map(m => m.id).join(', ')}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                Mesa {mesas[0].id} - {mesas[0].capacidade} pessoas
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Aviso sobre múltiplas reservas do cliente */}
        {isEditingMultipleReservations && (
          <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Cliente com Múltiplas Reservas</p>
                  <p className="text-amber-700 mt-1">
                    Este cliente possui {reservasDoCliente.length} reservas para hoje (mesas: {reservasDoCliente.map(r => r.id_mesa).join(', ')}). 
                  </p>
                </div>
                
                {/* Seletor de Modo */}
                <div className="mt-3 space-y-3">
                  <p className="text-sm font-medium text-amber-800">Escolha o que fazer:</p>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="modoEdicao"
                        value="todas"
                        checked={modoEdicao === 'todas'}
                        onChange={(e) => setModoEdicao(e.target.value as 'todas' | 'individual')}
                        className="text-amber-600"
                      />
                      <span className="text-sm text-amber-700">Editar/cancelar <strong>todas as {reservasDoCliente.length} reservas</strong> do cliente</span>
                    </label>
                    
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="modoEdicao"
                          value="individual"
                          checked={modoEdicao === 'individual'}
                          onChange={(e) => setModoEdicao(e.target.value as 'todas' | 'individual')}
                          className="text-amber-600"
                        />
                        <span className="text-sm text-amber-700">Editar/cancelar <strong>apenas uma mesa específica</strong></span>
                      </label>
                      
                      {/* Seletor de Mesa (só aparece quando modo individual está selecionado) */}
                      {modoEdicao === 'individual' && (
                        <div className="ml-6 mt-2">
                          <label className="block text-xs font-medium text-amber-800 mb-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            Escolha a mesa:
                          </label>
                          <select
                            value={mesaSelecionadaParaEdicao || ''}
                            onChange={(e) => setMesaSelecionadaParaEdicao(parseInt(e.target.value))}
                            className="w-full px-2 py-1 text-xs border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 focus:border-transparent bg-white"
                          >
                            {reservasDoCliente.map(reserva => (
                              <option key={reserva.id} value={reserva.id_mesa}>
                                Mesa {reserva.id_mesa} - {reserva.horario_reserva}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Informação sobre reserva múltipla (criação) */}
        {isMultipleMesas && !reserva && (
          <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Users className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Reserva para Múltiplas Mesas</p>
                <p className="text-blue-700 mt-1">
                  Uma reserva será criada para cada mesa selecionada com os mesmos dados do cliente.
                  <br />
                  <strong>Limite:</strong> Máximo {LIMITE_MESAS} mesas por dia.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Erro</p>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sucesso */}
        {successMessage && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <div className="text-sm">
                <p className="font-medium text-green-800">Sucesso</p>
                <p className="text-green-700 mt-1">{successMessage}</p>
              </div>
            </div>
          </div>
        )}
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome do Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Nome do Cliente
            </label>
            <input
              type="text"
              value={formData.nome_cliente}
              onChange={(e) => setFormData(prev => ({ ...prev, nome_cliente: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
              placeholder="Digite o nome do cliente"
              required
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Telefone
            </label>
            <input
              type="tel"
              value={formData.telefone_cliente}
              onChange={handlePhoneChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
              placeholder="(11) 99999-9999"
              required
            />
          </div>

          {/* Horário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              Horário da Reserva
            </label>
            <select
              value={formData.horario_reserva}
              onChange={(e) => setFormData(prev => ({ ...prev, horario_reserva: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
              required
            >
              <option value="">Selecione o horário</option>
              {TIME_SLOTS.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors resize-none"
              rows={3}
              placeholder={
                isMultipleMesas 
                  ? "Observações especiais para todas as mesas (opcional)"
                  : modoEdicao === 'individual' && mesaSelecionadaParaEdicao
                  ? `Observações para a mesa ${mesaSelecionadaParaEdicao} (opcional)`
                  : isEditingMultipleReservations && modoEdicao === 'todas'
                  ? "Observações especiais para todas as reservas do cliente (opcional)"
                  : "Observações especiais (opcional)"
              }
            />
          </div>

          {/* Botões */}
          <div className="flex space-x-3">
            {/* Botão de Salvar/Atualizar */}
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                loading 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : successMessage
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>
                    {reserva 
                      ? isEditingMultipleReservations
                        ? modoEdicao === 'todas'
                          ? 'Atualizando...'
                          : 'Atualizando mesa...'
                        : 'Atualizando...'
                      : isMultipleMesas 
                      ? 'Criando reservas...'
                      : 'Criando reserva...'
                    }
                  </span>
                </>
              ) : successMessage ? (
                <>
                  <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <span>Concluído!</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>
                    {reserva 
                      ? isEditingMultipleReservations
                        ? modoEdicao === 'todas'
                          ? `Atualizar ${reservasDoCliente.length} Reservas`
                          : `Atualizar Mesa ${mesaSelecionadaParaEdicao}`
                        : 'Atualizar Reserva'
                      : isMultipleMesas 
                      ? `Criar ${mesas.length} Reservas`
                      : 'Criar Reserva'
                    }
                  </span>
                </>
              )}
            </button>

            {/* Botão de Cancelar/Deletar */}
            {reserva && onDelete && (
              <>
                {isEditingMultipleReservations ? (
                  // Menu dropdown para múltiplas reservas
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowModoSelector(!showModoSelector)}
                      disabled={loading}
                      className={`px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                        loading 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-5 h-5" />
                          <Settings className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    
                    {showModoSelector && (
                      <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-56">
                        <button
                          type="button"
                          onClick={() => {
                            handleDelete('todas')
                            setShowModoSelector(false)
                          }}
                          disabled={loading}
                          className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 rounded-t-lg transition-colors"
                        >
                          Cancelar todas as {reservasDoCliente.length} reservas
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleDelete('individual')
                            setShowModoSelector(false)
                          }}
                          disabled={loading}
                          className="w-full px-4 py-3 text-left text-sm text-gray-600 hover:bg-gray-50 rounded-b-lg transition-colors border-t border-gray-100"
                        >
                          Cancelar apenas mesa {mesaSelecionadaParaEdicao || mesas[0]?.id}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // Botão simples para reserva única
                  <button
                    type="button"
                    onClick={() => handleDelete('individual')}
                    disabled={loading}
                    className={`px-4 py-3 rounded-lg transition-colors flex items-center justify-center ${
                      loading 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title="Cancelar reserva"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalReserva