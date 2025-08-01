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
          setReservas(prev => prev.map(res => res.id === payload.old?.id ? payload.new as Reserva : res));
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

  const criarReserva = useCallback(async (
    reservaData: Omit<Reserva, 'id' | 'created_at'>,
    dispatchWebhook = true
  ) => {
    try {
      const novaReserva = await createReserva(reservaData);
      if (dispatchWebhook) {
        await processWebhook(WEBHOOK_EVENTS.RESERVA_CRIADA, novaReserva);
      }
      return novaReserva;
    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      refetch();
      throw error;
    }
  }, [refetch]);

  const criarMultiplasReservas = useCallback(async (
    reservaData: Omit<Reserva, 'id' | 'created_at' | 'id_mesa'>,
    mesas: Mesa[]
  ) => {
    try {
      const promises = mesas.map(mesa => createReserva({ ...reservaData, id_mesa: mesa.id }, false));
      const novasReservas = await Promise.all(promises);
      const reservasValidas = novasReservas.filter(r => r !== null) as Reserva[];
      if (reservasValidas.length > 0) {
        await processWebhook(WEBHOOK_EVENTS.RESERVA_CRIADA, reservasValidas);
      }
      return reservasValidas;
    } catch (error) {
      console.error('Erro ao criar múltiplas reservas:', error);
      refetch();
      throw error;
    }
  }, [refetch]);

  const atualizarReserva = useCallback(async (
    id: string,
    reservaData: Partial<Reserva>,
    dispatchWebhook = true
  ) => {
    try {
      let dataToUpdate = { ...reservaData };

      if (reservaData.status === 'cancelada') {
        const originalReserva = await fetchReservas({ id });
        if (originalReserva && originalReserva.length > 0 && originalReserva[0].id_mesa !== null) {
          dataToUpdate.id_mesa_historico = originalReserva[0].id_mesa;
        }
        dataToUpdate.id_mesa = null;
      }

      const reservaAtualizada = await updateReserva(id, dataToUpdate);
      if (dispatchWebhook && reservaAtualizada) {
        // Se o status for cancelado, o evento correto deve ser usado
        const event = reservaData.status === 'cancelada' 
          ? WEBHOOK_EVENTS.RESERVA_CANCELADA 
          : WEBHOOK_EVENTS.RESERVA_ATUALIZADA;
        await processWebhook(event, reservaAtualizada);
      }
      return reservaAtualizada;
    } catch (error) {
      console.error('Erro ao atualizar reserva:', error);
      throw error;
    }
  }, []);

  const cancelarReserva = useCallback(async (id: string, dispatchWebhook = true) => {
    try {
      // A lógica de cancelamento agora é uma atualização de status
      const reservaCancelada = await atualizarReserva(id, { status: 'cancelada' }, dispatchWebhook);
      return reservaCancelada;
    } catch (error) {
      console.error('Erro ao cancelar reserva:', error);
      throw error;
    }
  }, [atualizarReserva]);

  const cancelarMultiplasReservas = useCallback(async (reservas: Reserva[]) => {
    try {
      const promises = reservas.map(r => atualizarReserva(r.id, { status: 'cancelada' }, false));
      const resultados = await Promise.all(promises);
      const reservasCanceladas = resultados.filter(r => r !== null) as Reserva[];
      if (reservasCanceladas.length > 0) {
        await processWebhook(WEBHOOK_EVENTS.RESERVA_CANCELADA, reservasCanceladas);
      }
      return reservasCanceladas;
    } catch (error) {
      console.error('Erro ao cancelar múltiplas reservas:', error);
      throw error;
    }
  }, [atualizarReserva]);

  const buscarReservasDoCliente = useCallback(async (nomeCliente: string, telefoneCliente: string, dataReserva: string) => {
    try {
      const reservasCliente = await fetchReservas({
        nome_cliente: nomeCliente,
        telefone_cliente: telefoneCliente,
        data_reserva: dataReserva
      });
      return reservasCliente;
    } catch (error) {
      console.error('Erro ao buscar reservas do cliente:', error);
      throw error;
    }
  }, []);

  const modificarReserva = useCallback(async (
    reservaOriginal: Reserva,
    novasMesas: Mesa[],
    reservaData: Partial<Omit<Reserva, 'id' | 'created_at' | 'id_mesa'>>
  ) => {
    setLoading(true);
    try {
      const { nome_cliente, telefone_cliente, data_reserva } = reservaOriginal;
      const reservasAtuaisDoCliente = await buscarReservasDoCliente(nome_cliente, telefone_cliente, data_reserva);
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
          status: reservaData.status || reservaOriginal.status,
        }, false)); // dispatchWebhook = false
      }

      for (const reserva of reservasParaRemover) {
        promises.push(deleteReserva(reserva.id, false)); // dispatchWebhook = false
      }

      for (const reserva of reservasParaAtualizar) {
        promises.push(updateReserva(reserva.id, reservaData, false)); // dispatchWebhook = false
      }

      await Promise.all(promises);

      const reservasFinais = await buscarReservasDoCliente(nome_cliente, telefone_cliente, data_reserva);
      if (reservasFinais.length > 0) {
        await processWebhook(WEBHOOK_EVENTS.RESERVA_ATUALIZADA, reservasFinais);
      }

    } catch (error) {
      console.error('Erro ao modificar reserva:', error);
      throw error;
    } finally {
      refetch();
    }
  }, [buscarReservasDoCliente, refetch]);

  const atualizarReservasDoCliente = useCallback(async (nomeCliente: string, telefoneCliente: string, dataReserva: string, reservaData: Partial<Reserva>) => {
    try {
      const reservasCliente = await buscarReservasDoCliente(nomeCliente, telefoneCliente, dataReserva);
      const promises = reservasCliente.map(reserva => updateReserva(reserva.id, reservaData, false));
      const resultados = await Promise.all(promises);
      
      const reservasAtualizadas = resultados.filter(r => r !== null) as Reserva[];
      if (reservasAtualizadas.length > 0) {
        await processWebhook(WEBHOOK_EVENTS.RESERVA_ATUALIZADA, reservasAtualizadas);
      }
    } catch (error) {
      console.error('Erro ao atualizar reservas do cliente:', error);
      throw error;
    }
  }, [buscarReservasDoCliente]);

  return {
    reservas,
    loading,
    error,
    refetch,
    criarReserva,
    criarMultiplasReservas,
    atualizarReserva,
    cancelarReserva,
    cancelarMultiplasReservas,
    buscarReservasDoCliente,
    atualizarReservasDoCliente,
    modificarReserva
  }
}
