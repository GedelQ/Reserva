import { useState, useEffect, useCallback } from 'react'
import { supabase, fetchReservas, createReserva, updateReserva, deleteReserva, type Reserva, type Mesa } from '../lib/supabase'
import { processWebhook, WEBHOOK_EVENTS } from '../lib/webhook'

export const useReservas = (dataFiltro?: string) => {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReservas(dataFiltro ? { data_reserva: dataFiltro } : undefined);
      setReservas(data);
    } catch (err) {
      console.error('Erro ao recarregar reservas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [dataFiltro]);

  useEffect(() => {
    const channel = supabase
      .channel('public:reservas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, payload => {
        if (payload.eventType === 'INSERT') {
          setReservas(prev => [...prev, payload.new as Reserva]);
        } else if (payload.eventType === 'UPDATE') {
          if ((payload.new as Reserva).status === 'cancelada') {
            setReservas(prev => prev.filter(res => res.id !== payload.old?.id));
          } else {
            setReservas(prev => prev.map(res => res.id === payload.old?.id ? payload.new as Reserva : res));
          }
        } else if (payload.eventType === 'DELETE') {
          setReservas(prev => prev.filter(res => res.id !== payload.old?.id));
        } else {
          refetch(); // Fallback para outros tipos de evento ou erros
        }
      })
      .subscribe();

    refetch(); // Carga inicial

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dataFiltro, refetch]);

  const criarReserva = useCallback(async (reservaData: Omit<Reserva, 'id' | 'created_at'>) => {
    try {
      const novaReserva = await createReserva(reservaData);
      await processWebhook(WEBHOOK_EVENTS.RESERVA_CRIADA, novaReserva);
      // O refetch automático do realtime cuidará da atualização da UI
      return novaReserva;
    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      refetch(); // Garante a consistência em caso de erro
      throw error;
    }
  }, [refetch]);

  const atualizarReserva = useCallback(async (id: string, reservaData: Partial<Reserva>) => {
    try {
      const reservaAtualizada = await updateReserva(id, reservaData)
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

  const modificarReserva = useCallback(async (
    reservaOriginal: Reserva,
    novasMesas: Mesa[],
    reservaData: Partial<Omit<Reserva, 'id' | 'created_at' | 'id_mesa'>>
  ) => {
    setLoading(true);
    try {
      const reservasAtuaisDoCliente = await buscarReservasDoCliente(
        reservaOriginal.nome_cliente,
        reservaOriginal.telefone_cliente,
        reservaOriginal.data_reserva
      );
      const idsMesasAtuais = new Set(reservasAtuaisDoCliente.map(r => r.id_mesa));
      const idsMesasNovas = new Set(novasMesas.map(m => m.id));

      const mesasParaAdicionar = novasMesas.filter(m => !idsMesasAtuais.has(m.id));
      const reservasParaRemover = reservasAtuaisDoCliente.filter(r => !idsMesasNovas.has(r.id_mesa));
      const reservasParaAtualizar = reservasAtuaisDoCliente.filter(r => idsMesasNovas.has(r.id_mesa));

      const promises = [];

      for (const mesa of mesasParaAdicionar) {
        promises.push(createReserva({
          ...reservaData,
          id_mesa: mesa.id,
          data_reserva: reservaOriginal.data_reserva,
          nome_cliente: reservaData.nome_cliente || reservaOriginal.nome_cliente,
          telefone_cliente: reservaData.telefone_cliente || reservaOriginal.telefone_cliente,
          horario_reserva: reservaData.horario_reserva || reservaOriginal.horario_reserva,
          status: reservaData.status || reservaOriginal.status, // Adicionado o status
        }));
      }

      for (const reserva of reservasParaRemover) {
        promises.push(deleteReserva(reserva.id));
      }

      for (const reserva of reservasParaAtualizar) {
        promises.push(updateReserva(reserva.id, reservaData));
      }

      await Promise.all(promises);

    } catch (error) {
      console.error('Erro ao modificar reserva:', error);
      throw error;
    } finally {
      refetch();
    }
  }, [buscarReservasDoCliente, refetch]);


  const atualizarReservasDoCliente = useCallback(async (nomeCliente: string, telefoneCliente: string, dataReserva: string, reservaData: Partial<Reserva>) => {
    try {
      const reservasCliente = await buscarReservasDoCliente(nomeCliente, telefoneCliente, dataReserva)
      const promises = reservasCliente.map(reserva => updateReserva(reserva.id, reservaData))
      await Promise.all(promises)
    } catch (error) {
      console.error('Erro ao atualizar reservas do cliente:', error)
      throw error
    }
  }, [buscarReservasDoCliente])

  const cancelarReservasDoCliente = useCallback(async (nomeCliente: string, telefoneCliente: string, dataReserva: string) => {
    try {
      const reservasCliente = await buscarReservasDoCliente(nomeCliente, telefoneCliente, dataReserva);
      const promises = reservasCliente.map(reserva => deleteReserva(reserva.id));
      await Promise.all(promises);
    } catch (error) {
      console.error('Erro ao cancelar reservas do cliente:', error);
      throw error;
    }
  }, [buscarReservasDoCliente]);

  return {
    reservas,
    loading,
    error,
    refetch,
    criarReserva,
    atualizarReserva,
    cancelarReserva,
    buscarReservasDoCliente,
    atualizarReservasDoCliente,
    cancelarReservasDoCliente,
    modificarReserva
  }
}
