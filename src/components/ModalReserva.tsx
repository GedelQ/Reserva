import React, { useState, useEffect } from 'react'
import { X, User, Phone, Clock, FileText, Save, Edit } from 'lucide-react'
import { Mesa, Reserva, TIME_SLOTS } from '../lib/supabase'

interface ModalReservaProps {
  mesas: Mesa[]
  reserva?: Reserva | null
  isOpen: boolean
  onClose: () => void
  onSave: (reservaData: Partial<Omit<Reserva, 'id' | 'created_at'>>) => void
  onEditMesas?: () => void
  dataFiltro: string
  isDashboardMode?: boolean
}

const ModalReserva: React.FC<ModalReservaProps> = ({
  mesas,
  reserva,
  isOpen,
  onClose,
  onSave,
  onEditMesas,
  dataFiltro,
  isDashboardMode = false
}) => {
  const [formData, setFormData] = useState({
    nome_cliente: '',
    telefone_cliente: '',
    horario_reserva: '',
    observacoes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      setFormData({
        nome_cliente: reserva?.nome_cliente || '',
        telefone_cliente: reserva?.telefone_cliente || '',
        horario_reserva: reserva?.horario_reserva || '',
        observacoes: reserva?.observacoes || ''
      });
      setError('');
      setSuccessMessage('');
      setLoading(false);
    }
  }, [isOpen, reserva]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      await onSave({
        ...formData,
        data_reserva: dataFiltro,
        status: 'ativa',
      });
      setSuccessMessage(reserva ? 'Reserva atualizada com sucesso!' : 'Reserva criada com sucesso!');
      setTimeout(() => onClose(), 1500);
    } catch (error: any) {
      setError('Erro ao salvar reserva. Tente novamente.')
      setLoading(false)
    }
  }

  if (!isOpen || mesas.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {isDashboardMode ? 'Editar Detalhes da Reserva' : (reserva ? 'Confirmar Edição' : 'Nova Reserva')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Cliente</label>
            <input type="text" value={formData.nome_cliente} onChange={(e) => setFormData(prev => ({ ...prev, nome_cliente: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
            <input type="tel" value={formData.telefone_cliente} onChange={(e) => setFormData(prev => ({ ...prev, telefone_cliente: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required />
          </div>
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horário da Reserva</label>
              <select value={formData.horario_reserva} onChange={(e) => setFormData(prev => ({ ...prev, horario_reserva: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required>
                <option value="">Selecione o horário</option>
                {TIME_SLOTS.map(time => <option key={time} value={time}>{time}</option>)}
              </select>
            </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
            <textarea value={formData.observacoes} onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none" rows={3}></textarea>
          </div>
          <div className="flex space-x-3">
            {isDashboardMode && onEditMesas && (
              <button type="button" onClick={onEditMesas} className="flex-1 py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 bg-blue-600 text-white hover:bg-blue-700">
                <Edit className="w-5 h-5" />
                <span>Editar Mesas</span>
              </button>
            )}
            <button type="submit" disabled={loading} className="flex-1 py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400">
              {loading ? <span>Salvando...</span> : <><Save className="w-5 h-5" /><span>{isDashboardMode ? 'Salvar Detalhes' : 'Confirmar Reserva'}</span></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalReserva
