
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const LIMITE_MESAS = 30;
const STATUS_ATIVOS = ['pendente', 'confirmada'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    let path = url.pathname;

    if (path.startsWith('/functions/v1/reservas-api')) {
      path = path.replace('/functions/v1/reservas-api', '');
    } else if (path.startsWith('/reservas-api')) {
      path = path.replace('/reservas-api', '');
    }
    
    if (!path || path === '/') {
      path = '/status';
    }

    const method = req.method;
    console.log(`Request: ${method} ${path}`);

    // GET /disponibilidade
    if (method === 'GET' && path === '/disponibilidade') {
      const dataReserva = url.searchParams.get('data_reserva');
      if (!dataReserva) {
        return new Response(JSON.stringify({ error: 'Parâmetro data_reserva é obrigatório (YYYY-MM-DD)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: reservasExistentes, error } = await supabaseClient
        .from('reservas')
        .select('id_mesa')
        .eq('data_reserva', dataReserva)
        .in('status', STATUS_ATIVOS);

      if (error) throw error;

      const mesasOcupadas = reservasExistentes?.map(r => r.id_mesa) || [];
      const totalMesasReservadas = new Set(mesasOcupadas).size;
      const mesasDisponiveisCount = LIMITE_MESAS - totalMesasReservadas;
      
      const todasMesas = Array.from({ length: 98 }, (_, i) => i + 1);
      const mesasLivres = todasMesas.filter(mesa => !mesasOcupadas.includes(mesa));

      const response = {
        data_consulta: dataReserva,
        limite_mesas_por_dia: LIMITE_MESAS,
        total_mesas_reservadas: totalMesasReservadas,
        total_mesas_disponiveis: mesasDisponiveisCount,
        mesas_disponiveis_lista: mesasLivres,
        horarios_disponiveis: ['18:00', '18:30', '19:00', '19:30', '20:00']
      };
      return new Response(JSON.stringify(response), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // GET /reservas
    if (method === 'GET' && path === '/reservas') {
        const dataReserva = url.searchParams.get('data_reserva');
        const clienteNome = url.searchParams.get('cliente_nome');
        const clienteTelefone = url.searchParams.get('cliente_telefone');
        const mesa = url.searchParams.get('mesa');
        const statusParam = url.searchParams.get('status');

        let query = supabaseClient.from('reservas').select('*').order('horario_reserva', { ascending: true });

        if (dataReserva) query = query.eq('data_reserva', dataReserva);
        if (clienteNome) query = query.ilike('nome_cliente', `%${clienteNome}%`);
        if (clienteTelefone) query = query.like('telefone_cliente', `%${clienteTelefone.replace(/\D/g, '')}%`);
        if (mesa) query = query.eq('id_mesa', parseInt(mesa));
        if (statusParam) {
            const statusList = statusParam.split(',').map(s => s.trim());
            query = query.in('status', statusList);
        } else {
            query = query.in('status', STATUS_ATIVOS);
        }

        const { data: reservas, error } = await query;
        if (error) throw error;

        return new Response(JSON.stringify({ reservas: reservas || [], total: reservas?.length || 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST /reservas
    if (method === 'POST' && path === '/reservas') {
        const body = await req.json();
        const { nome_cliente, telefone_cliente, data_reserva, horario_reserva, mesas, observacoes, status } = body;

        if (!nome_cliente || !telefone_cliente || !data_reserva || !horario_reserva || !mesas || !Array.isArray(mesas) || mesas.length === 0) {
            return new Response(JSON.stringify({ error: 'Campos obrigatórios: nome_cliente, telefone_cliente, data_reserva, horario_reserva, e um array de mesas.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: reservasExistentes, error: errorCount } = await supabaseClient.from('reservas').select('id').eq('data_reserva', data_reserva).in('status', STATUS_ATIVOS);
        if (errorCount) throw errorCount;

        if ((reservasExistentes?.length || 0) + mesas.length > LIMITE_MESAS) {
            return new Response(JSON.stringify({ error: `Limite de ${LIMITE_MESAS} mesas por dia seria ultrapassado.` }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: mesasOcupadas, error: errorMesas } = await supabaseClient.from('reservas').select('id_mesa').eq('data_reserva', data_reserva).in('status', STATUS_ATIVOS).in('id_mesa', mesas);
        if (errorMesas) throw errorMesas;

        if (mesasOcupadas && mesasOcupadas.length > 0) {
            return new Response(JSON.stringify({ error: `Mesas já ocupadas: ${mesasOcupadas.map(m => m.id_mesa).join(', ')}` }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const reservasParaCriar = mesas.map(mesaId => ({
            id_mesa: mesaId,
            nome_cliente,
            telefone_cliente,
            data_reserva,
            horario_reserva,
            observacoes: observacoes || '',
            status: ['pendente', 'confirmada'].includes(status) ? status : 'pendente'
        }));

        const { data: novasReservas, error: errorCriar } = await supabaseClient.from('reservas').insert(reservasParaCriar).select();
        if (errorCriar) throw errorCriar;

        return new Response(JSON.stringify({ message: 'Reservas criadas com sucesso', reservas: novasReservas }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // PUT /reservas/:id
    if (method === 'PUT' && path.startsWith('/reservas/')) {
        const reservaId = path.split('/')[2];
        const body = await req.json();
        
        // Evitar que campos não permitidos sejam atualizados diretamente
        const { id, created_at, ...updateData } = body;

        const { data: reservaAtualizada, error } = await supabaseClient.from('reservas').update(updateData).eq('id', reservaId).select();
        if (error) throw error;

        if (!reservaAtualizada || reservaAtualizada.length === 0) {
            return new Response(JSON.stringify({ error: 'Reserva não encontrada' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ message: 'Reserva atualizada com sucesso', reserva: reservaAtualizada[0] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // DELETE /reservas/:id
    if (method === 'DELETE' && path.startsWith('/reservas/')) {
        const reservaId = path.split('/')[2];
        const { data: reservaCancelada, error } = await supabaseClient
            .from('reservas')
            .update({ status: 'cancelada' })
            .eq('id', reservaId)
            .in('status', STATUS_ATIVOS)
            .select();

        if (error) throw error;

        if (!reservaCancelada || reservaCancelada.length === 0) {
            return new Response(JSON.stringify({ error: 'Reserva não encontrada ou já estava cancelada' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ message: 'Reserva cancelada com sucesso', reserva: reservaCancelada[0] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // GET /status
    if (method === 'GET' && path === '/status') {
        return new Response(JSON.stringify({ status: 'online', api_version: '1.1.0' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Endpoint não encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Erro na edge function:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor', detalhes: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
