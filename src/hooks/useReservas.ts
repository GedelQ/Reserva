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
        setReservas(prevReservas => {
          switch (payload.eventType) {
            case 'INSERT':
              return [...prevReservas, payload.new as Reserva];
            case 'UPDATE':
              return prevReservas.map(reserva =>
                reserva.id === (payload.new as Reserva).id ? (payload.new as Reserva) : reserva
              );
            case 'DELETE':
              return prevReservas.filter(reserva => reserva.id !== (payload.old as Reserva).id);
            default:
              return prevReservas;
          }
        });
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
    // Otimisticamente remove a reserva da UI
    const previousReservas = reservas
    setReservas(currentReservas => currentReservas.filter(reserva => reserva.id !== id))

    try {
      const reservaCancelada = await deleteReserva(id)
      // O Realtime ainda vai disparar o loadReservas para garantir consistência,
      // mas a UI já estará atualizada otimisticamente.
      if (reservaCancelada) {
        await processWebhook(WEBHOOK_EVENTS.RESERVA_CANCELADA, reservaCancelada)
      }
      return reservaCancelada
    } catch (error) {
      console.error('Erro ao cancelar reserva:', error)
      // Em caso de erro, reverte a UI para o estado anterior
      setReservas(previousReservas)
      throw error
    }
  }, [reservas])

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
    const previousReservas = reservas; // Store current state for rollback

    try {
      const reservasCliente = await buscarReservasDoCliente(nomeCliente, telefoneCliente, dataReserva);
      const idsToCancel = new Set(reservasCliente.map(reserva => reserva.id));

      // Optimistically remove the reservations from the UI
      setReservas(currentReservas => currentReservas.filter(reserva => !idsToCancel.has(reserva.id)));

      const promises = reservasCliente.map(reserva => deleteReserva(reserva.id));
      const cancelledReservas = await Promise.all(promises);

      // Process webhooks for each cancelled reservation
      for (const reservaCancelada of cancelledReservas) {
        if (reservaCancelada) {
          await processWebhook(WEBHOOK_EVENTS.RESERVA_CANCELADA, reservaCancelada);
        }
      }
      // The Realtime will still trigger loadReservas for consistency,
      // but the UI will already be updated optimistically.
    } catch (error) {
      console.error('Erro ao cancelar reservas do cliente:', error);
      // In case of error, revert the UI to the previous state
      setReservas(previousReservas);
      throw error;
    }
  }, [buscarReservasDoCliente, reservas]);

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
