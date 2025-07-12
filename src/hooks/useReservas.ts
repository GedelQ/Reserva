import { useState, useEffect, useCallback } from 'react'
import { supabase, fetchReservas, createReserva, updateReserva, deleteReserva, type Reserva } from '../lib/supabase'
import { processWebhook, WEBHOOK_EVENTS } from '../lib/webhook'

export const useReservas = (dataFiltro?: string) => {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReservas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchReservas(dataFiltro ? { data_reserva: dataFiltro } : undefined)
      setReservas(data)
      return data // Retorna os dados buscados
    } catch (err) {
      console.error('Erro ao carregar reservas:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      return [] // Retorna array vazio em caso de erro
    } finally {
      setLoading(false)
    }
  }, [dataFiltro])

  useEffect(() => {
    loadReservas()

    const channel = supabase
      .channel('public:reservas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, payload => {
        // Força o recarregamento dos dados em qualquer evento Realtime
        loadReservas()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [dataFiltro, loadReservas])

  const criarReserva = useCallback(async (reservaData: Omit<Reserva, 'id' | 'created_at'>) => {
    try {
      const novaReserva = await createReserva(reservaData)
      // O Realtime vai disparar o loadReservas, não precisamos fazer aqui
      return novaReserva
    } catch (error) {
      console.error('Erro ao criar reserva:', error)
      throw error
    }
  }, [])

  const atualizarReserva = useCallback(async (id: string, reservaData: Partial<Reserva>) => {
    try {
      const reservaAtualizada = await updateReserva(id, reservaData)
      // O Realtime vai disparar o loadReservas, não precisamos fazer aqui
      if (reservaAtualizada) {
        await processWebhook(WEBHOOK_EVENTS.RESERVA_ATUALIZADA, reservaAtualizada)
      }
      return reservaAtualizada
    } catch (error) {
      console.error('Erro ao atualizar reserva:', error)
      throw error
    }
  }, [])

  const cancelarReserva = useCallback(async (id: string) => {
    try {
      const reservaCancelada = await deleteReserva(id)
      // O Realtime vai disparar o loadReservas, não precisamos fazer aqui
      if (reservaCancelada) {
        await processWebhook(WEBHOOK_EVENTS.RESERVA_CANCELADA, reservaCancelada)
      }
      return reservaCancelada
    } catch (error) {
      console.error('Erro ao cancelar reserva:', error)
      throw error
    }
  }, [])

  const buscarReservasDoCliente = useCallback(async (nomeCliente: string, telefoneCliente: string, dataReserva: string) => {
    try {
      const reservasCliente = await fetchReservas({
        nome_cliente: nomeCliente,
        telefone_cliente: telefoneCliente,
        data_reserva: dataReserva
      })
      return reservasCliente
    } catch (error) {
      console.error('Erro ao buscar reservas do cliente:', error)
      throw error
    }
  }, [])

  const atualizarReservasDoCliente = useCallback(async (nomeCliente: string, telefoneCliente: string, dataReserva: string, reservaData: Partial<Reserva>) => {
    try {
      const reservasCliente = await buscarReservasDoCliente(nomeCliente, telefoneCliente, dataReserva)
      const promises = reservasCliente.map(reserva => updateReserva(reserva.id, reservaData))
      await Promise.all(promises)
      // O Realtime vai disparar o loadReservas, não precisamos fazer aqui
    } catch (error) {
      console.error('Erro ao atualizar reservas do cliente:', error)
      throw error
    }
  }, [buscarReservasDoCliente])

  const cancelarReservasDoCliente = useCallback(async (nomeCliente: string, telefoneCliente: string, dataReserva: string) => {
    try {
      const reservasCliente = await buscarReservasDoCliente(nomeCliente, telefoneCliente, dataReserva)
      const promises = reservasCliente.map(reserva => deleteReserva(reserva.id))
      await Promise.all(promises)
      // O Realtime vai disparar o loadReservas, não precisamos fazer aqui
    } catch (error) {
      console.error('Erro ao cancelar reservas do cliente:', error)
      throw error
    }
  }, [buscarReservasDoCliente])

  return {
    reservas,
    loading,
    error,
    refetch: loadReservas,
    criarReserva,
    atualizarReserva,
    cancelarReserva,
    buscarReservasDoCliente,
    atualizarReservasDoCliente,
    cancelarReservasDoCliente
  }
}
