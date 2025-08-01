import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const LIMITE_MESAS = 30;
const STATUS_ATIVOS = ['pendente', 'confirmada'];

// Helper para criar respostas padronizadas
const createJsonResponse = (body: object, status = 200) => {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: status // Manteremos 200 para todos, mas o parâmetro existe para flexibilidade
  });
};

const successResponse = (data: object) => {
    return createJsonResponse({ success: true, data });
}

const errorResponse = (message: string, errorCode = 400, details?: object) => {
    return createJsonResponse({ 
        success: false, 
        error: { 
            code: errorCode, 
            message,
            ...(details && { details })
        }
    }, 200); // Sempre retorna 200 OK
}


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

    // GET /disponibilidade
    if (method === 'GET' && path === '/disponibilidade') {
      const dataReserva = url.searchParams.get('data_reserva');
      if (!dataReserva) {
        return errorResponse('Parâmetro data_reserva é obrigatório (YYYY-MM-DD)', 400);
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

      return successResponse({
        data_consulta: dataReserva,
        limite_mesas_por_dia: LIMITE_MESAS,
        total_mesas_reservadas: totalMesasReservadas,
        total_mesas_disponiveis: mesasDisponiveisCount,
        mesas_disponiveis_lista: mesasLivres,
        horarios_disponiveis: ['18:00', '18:30', '19:00', '19:30', '20:00']
      });
    }

    // GET /reservas
    if (method === 'GET' && path === '/reservas') {
        const dataReserva = url.searchParams.get('data_reserva');
        const statusParam = url.searchParams.get('status');
        let query = supabaseClient.from('reservas').select('*').order('horario_reserva', { ascending: true });

        if (dataReserva) query = query.eq('data_reserva', dataReserva);
        if (statusParam) {
            query = query.in('status', statusParam.split(',').map(s => s.trim()));
        } else {
            query = query.in('status', STATUS_ATIVOS);
        }

        const { data: reservas, error } = await query;
        if (error) throw error;

        return successResponse({ reservas: reservas || [], total: reservas?.length || 0 });
    }

    // POST /reservas
    if (method === 'POST' && path === '/reservas') {
        const body = await req.json();
        const { nome_cliente, telefone_cliente, data_reserva, horario_reserva, mesas, status } = body;

        if (!nome_cliente || !telefone_cliente || !data_reserva || !horario_reserva || !mesas || !Array.isArray(mesas) || mesas.length === 0) {
            return errorResponse('Campos obrigatórios: nome_cliente, telefone_cliente, data_reserva, horario_reserva, e um array de mesas.', 400);
        }

        const { data: countData, error: errorCount } = await supabaseClient.from('reservas').select('id', { count: 'exact' }).eq('data_reserva', data_reserva).in('status', STATUS_ATIVOS);
        if (errorCount) throw errorCount;

        if ((countData?.length || 0) + mesas.length > LIMITE_MESAS) {
            return errorResponse(`Limite de ${LIMITE_MESAS} mesas por dia seria ultrapassado.`, 409);
        }

        const { data: mesasOcupadas, error: errorMesas } = await supabaseClient.from('reservas').select('id_mesa').eq('data_reserva', data_reserva).in('status', STATUS_ATIVOS).in('id_mesa', mesas);
        if (errorMesas) throw errorMesas;

        if (mesasOcupadas && mesasOcupadas.length > 0) {
            return errorResponse(`Mesas já ocupadas: ${mesasOcupadas.map(m => m.id_mesa).join(', ')}`, 409);
        }

        const reservasParaCriar = mesas.map(mesaId => ({ ...body, id_mesa: mesaId, status: ['pendente', 'confirmada'].includes(status) ? status : 'pendente' }));
        const { data: novasReservas, error: errorCriar } = await supabaseClient.from('reservas').insert(reservasParaCriar).select();
        if (errorCriar) throw errorCriar;

        return successResponse({ message: 'Reservas criadas com sucesso', reservas: novasReservas });
    }

    // PUT /reservas/:id
    if (method === 'PUT' && path.startsWith('/reservas/')) {
        const reservaId = path.split('/')[2];
        const { id, created_at, ...updateData } = await req.json();
        const { data, error } = await supabaseClient.from('reservas').update(updateData).eq('id', reservaId).select();
        if (error) throw error;
        if (!data || data.length === 0) return errorResponse('Reserva não encontrada', 404);

        return successResponse({ message: 'Reserva atualizada com sucesso', reserva: data[0] });
    }

    // DELETE /reservas/:id
    if (method === 'DELETE' && path.startsWith('/reservas/')) {
        const reservaId = path.split('/')[2];
        const { data, error } = await supabaseClient.from('reservas').update({ status: 'cancelada' }).eq('id', reservaId).in('status', STATUS_ATIVOS).select();
        if (error) throw error;
        if (!data || data.length === 0) return errorResponse('Reserva não encontrada ou já estava cancelada', 404);

        return successResponse({ message: 'Reserva cancelada com sucesso', reserva: data[0] });
    }

    // GET /status
    if (method === 'GET' && path === '/status') {
        return successResponse({ status: 'online', api_version: '1.2.0' });
    }

    return errorResponse('Endpoint não encontrado', 404);

  } catch (error) {
    console.error('Erro fatal na edge function:', error);
    return errorResponse('Erro interno do servidor', 500, { detalhes: error.message });
  }
});