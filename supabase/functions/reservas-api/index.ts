import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Início da Lógica de Webhook ---

// Tipos do Webhook e da Reserva
interface Reserva {
  id: string;
  created_at: string;
  id_mesa: number | null;
  nome_cliente: string;
  telefone_cliente: string;
  data_reserva: string;
  horario_reserva: string;
  observacoes: string;
  status: 'confirmada' | 'cancelada' | 'finalizada' | 'pendente';
  id_mesa_historico?: number | null;
}

interface WebhookConfig {
  id: string;
  endpoint_url: string;
  enabled: boolean;
  secret_key?: string;
  events: string[];
}

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    source: 'api' | 'interface';
    reservas: Reserva[];
    cliente?: {
      nome: string;
      telefone: string;
    };
    mesas?: (number | null)[];
    total_mesas?: number;
    [key: string]: any;
  };
}

const WEBHOOK_EVENTS = {
  RESERVA_CRIADA: 'reserva_criada',
  RESERVA_ATUALIZADA: 'reserva_atualizada',
  RESERVA_CANCELADA: 'reserva_cancelada',
} as const;

// Função para gerar assinatura HMAC-SHA256
const generateSignature = async (payload: string, secret: string): Promise<string> => {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `sha256=${hashHex}`;
};

// Função para enviar webhook
const sendWebhook = async (config: WebhookConfig, payload: WebhookPayload): Promise<boolean> => {
  try {
    const payloadString = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Pizzaria-Webhook/1.0',
      'X-Webhook-Event': payload.event,
      'X-Webhook-Timestamp': payload.timestamp,
    };

    if (config.secret_key) {
      headers['X-Webhook-Signature'] = await generateSignature(payloadString, config.secret_key);
    }

    const response = await fetch(config.endpoint_url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(10000) // Timeout de 10 segundos
    });

    if (!response.ok) {
      console.error(`Webhook failed: ${response.status} - ${await response.text()}`);
      return false;
    }

    console.log(`Webhook sent successfully to ${config.endpoint_url}`);
    return true;
  } catch (error) {
    console.error('Error sending webhook:', error);
    return false;
  }
};

// Função para registrar tentativa de webhook
const logWebhookAttempt = async (
  supabaseClient: any,
  configId: string,
  event: string,
  success: boolean,
  errorMessage?: string
) => {
  try {
    await supabaseClient.from('webhook_logs').insert([{
      config_id: configId,
      event,
      success,
      error_message: errorMessage,
    }]);
  } catch (error) {
    console.error('Error logging webhook attempt:', error);
  }
};

// Função principal para processar webhook
const processWebhook = async (supabaseClient: any, event: string, reserva: Reserva | Reserva[]): Promise<void> => {
  try {
    const { data: config, error } = await supabaseClient
      .from('webhook_config')
      .select('*')
      .eq('enabled', true)
      .limit(1);

    if (error || !config || config.length === 0) {
      console.log('No active webhook configuration found.');
      return;
    }

    const webhookConfig = config[0] as WebhookConfig;

    if (!webhookConfig.events.includes(event)) {
      console.log(`Event ${event} not configured for webhook.`);
      return;
    }

    const reservas = Array.isArray(reserva) ? reserva : [reserva];
    if (reservas.length === 0) return;
    
    const primeiraReserva = reservas[0];

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data: {
        source: 'api',
        reservas: reservas,
        cliente: {
          nome: primeiraReserva.nome_cliente,
          telefone: primeiraReserva.telefone_cliente,
        },
        mesas: reservas.map(r => r.status === 'cancelada' ? r.id_mesa_historico : r.id_mesa),
        total_mesas: reservas.length,
        data_reserva: primeiraReserva.data_reserva,
        horario_reserva: primeiraReserva.horario_reserva,
        observacoes: primeiraReserva.observacoes,
      },
    };

    const success = await sendWebhook(webhookConfig, payload);
    await logWebhookAttempt(
      supabaseClient,
      webhookConfig.id,
      event,
      success,
      success ? undefined : 'Failed to send webhook'
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
  }
};

// --- Fim da Lógica de Webhook ---

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

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const url = new URL(req.url);
    let path = url.pathname;
    if (path.startsWith('/functions/v1/reservas-api')) {
      path = path.replace('/functions/v1/reservas-api', '');
    } else if (path.startsWith('/reservas-api')) {
      path = path.replace('/reservas-api', '');
    }
    if (!path || path === '/') path = '/status';

    const method = req.method;
    console.log(`Request: ${method} ${path}`);

    // GET /disponibilidade
    if (method === 'GET' && path === '/disponibilidade') {
      const dataReserva = url.searchParams.get('data_reserva');
      if (!dataReserva) {
        return new Response(JSON.stringify({
          success: false,
          status_code_real: 400,
          message: 'Parâmetro data_reserva é obrigatório (YYYY-MM-DD)'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: reservasExistentes, error } = await supabaseClient
        .from('reservas')
        .select('id_mesa')
        .eq('data_reserva', dataReserva)
        .in('status', STATUS_ATIVOS);
      if (error) throw error;

      const mesasOcupadas = reservasExistentes?.map((r) => r.id_mesa) || [];
      const totalMesasReservadas = new Set(mesasOcupadas).size;
      const mesasDisponiveisCount = LIMITE_MESAS - totalMesasReservadas;
      const todasMesas = Array.from({ length: 98 }, (_, i) => i + 1);
      const mesasLivres = todasMesas.filter((mesa) => !mesasOcupadas.includes(mesa));

      const response = {
        data_consulta: dataReserva,
        limite_mesas_por_dia: LIMITE_MESAS,
        total_mesas_reservadas: totalMesasReservadas,
        total_mesas_disponiveis: mesasDisponiveisCount,
        mesas_disponiveis_lista: mesasLivres,
        horarios_disponiveis: ['18:00', '18:30', '19:00', '19:30', '20:00']
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /reservas (agora mais específico)
    if (method === 'GET' && path === '/reservas') {
      const dataReserva = url.searchParams.get('data_reserva');
      const numeroReserva = url.searchParams.get('numero_reserva');
      const telefoneCliente = url.searchParams.get('telefone_cliente');
      const clienteNome = url.searchParams.get('cliente_nome');
      const mesa = url.searchParams.get('mesa');
      const statusParam = url.searchParams.get('status');

      let query = supabaseClient.from('reservas').select('*').order('horario_reserva', { ascending: true });

      if (dataReserva) query = query.eq('data_reserva', dataReserva);
      if (numeroReserva) query = query.eq('numero_reserva', numeroReserva);
      if (telefoneCliente) query = query.like('telefone_cliente', `%${telefoneCliente.replace(/\D/g, '')}%`);
      if (clienteNome) query = query.ilike('nome_cliente', `%${clienteNome}%`);
      if (mesa) query = query.eq('id_mesa', parseInt(mesa));

      if (statusParam) {
        const statusList = statusParam.split(',').map((s) => s.trim());
        query = query.in('status', statusList);
      } else if (!numeroReserva) {
        query = query.in('status', STATUS_ATIVOS);
      }

      const { data: reservas, error } = await query;
      if (error) throw error;

      if (!reservas || reservas.length === 0) {
        const isQueryingSpecificReserva = numeroReserva || telefoneCliente || clienteNome;
        const message = isQueryingSpecificReserva
          ? 'Nenhuma reserva encontrada com os filtros fornecidos.'
          : 'Nenhuma reserva encontrada para a data e status atuais. Para verificar mesas livres, use o endpoint /disponibilidade?data_reserva=YYYY-MM-DD';

        return new Response(JSON.stringify({
          message: message,
          reservas: [],
          total: 0
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const groupedReservas = new Map<number, any>();

      for (const reserva of reservas) {
        if (!reserva.numero_reserva) continue;

        if (groupedReservas.has(reserva.numero_reserva)) {
          const existing = groupedReservas.get(reserva.numero_reserva);
          existing.mesas.push(reserva.id_mesa);
        } else {
          const newGroup = {
            ...reserva,
            id_ancora: reserva.id,
            mesas: [reserva.id_mesa]
          };
          delete newGroup.id_mesa;
          groupedReservas.set(reserva.numero_reserva, newGroup);
        }
      }

      const resultadoFinal = Array.from(groupedReservas.values());

      return new Response(JSON.stringify({
        reservas: resultadoFinal,
        total: resultadoFinal.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (method === 'POST' && path === '/reservas') {
      const body = await req.json();
      const { nome_cliente, telefone_cliente, data_reserva, horario_reserva, mesas, observacoes, status } = body;

      if (!nome_cliente || !telefone_cliente || !data_reserva || !horario_reserva || !mesas || !Array.isArray(mesas) || mesas.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          status_code_real: 400,
          message: 'Campos obrigatórios: nome_cliente, telefone_cliente, data_reserva, horario_reserva, e um array de mesas.'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: reservasExistentes, error: errorCount } = await supabaseClient
        .from('reservas')
        .select('id')
        .eq('data_reserva', data_reserva)
        .in('status', STATUS_ATIVOS);
      if (errorCount) throw errorCount;

      if ((reservasExistentes?.length || 0) + mesas.length > LIMITE_MESAS) {
        return new Response(JSON.stringify({
          success: false,
          status_code_real: 409,
          message: `Limite de ${LIMITE_MESAS} mesas por dia seria ultrapassado.`
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: mesasOcupadas, error: errorMesas } = await supabaseClient
        .from('reservas')
        .select('id_mesa')
        .eq('data_reserva', data_reserva)
        .in('status', STATUS_ATIVOS)
        .in('id_mesa', mesas);
      if (errorMesas) throw errorMesas;

      if (mesasOcupadas && mesasOcupadas.length > 0) {
        return new Response(JSON.stringify({
          success: false,
          status_code_real: 409,
          message: `Mesas já ocupadas: ${mesasOcupadas.map((m) => m.id_mesa).join(', ')}`
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: numeroData, error: numeroError } = await supabaseClient.rpc('gerar_numero_reserva')

      if (numeroError) {
        return new Response(
          JSON.stringify({
            error: 'Erro ao gerar número da reserva',
            detalhes: numeroError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
      const novoNumeroReserva = numeroData

      const reservasParaCriar = mesas.map((mesaId) => ({
        id_mesa: mesaId,
        nome_cliente,
        telefone_cliente,
        data_reserva,
        horario_reserva,
        observacoes: observacoes || '',
        status: ['pendente', 'confirmada'].includes(status) ? status : 'pendente',
        numero_reserva: novoNumeroReserva, // Usar o mesmo número para todas
      }));

      const { data: novasReservas, error: errorCriar } = await supabaseClient
        .from('reservas')
        .insert(reservasParaCriar)
        .select();
      if (errorCriar) throw errorCriar;

      // Dispara o webhook sem bloquear a resposta
      processWebhook(supabaseClient, WEBHOOK_EVENTS.RESERVA_CRIADA, novasReservas);

      if (!novasReservas || novasReservas.length === 0) {
          return new Response(JSON.stringify({
              message: 'Reserva criada, mas não foi possível retornar os dados.',
              reservas: []
          }), {
              status: 201,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
      }

      const primeiraReserva = novasReservas[0];
      const mesasDaReserva = novasReservas.map(r => r.id_mesa);

      const reservaAgrupada = {
          ...primeiraReserva,
          id_ancora: primeiraReserva.id,
          mesas: mesasDaReserva
      };
      delete reservaAgrupada.id_mesa;

      return new Response(JSON.stringify({
        message: 'Reservas criadas com sucesso',
        reserva: reservaAgrupada
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } 
    
    if (method === 'POST' && path === '/reservas/modificar-mesas') {
      const bodyText = await req.text();
      if (!bodyText) {
          return new Response(JSON.stringify({
              success: false, status_code_real: 400, message: 'Corpo da requisição está vazio. Certifique-se de enviar os dados em formato JSON.'
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      let body;
      try {
          body = JSON.parse(bodyText);
      } catch (e) {
          return new Response(JSON.stringify({
              success: false, status_code_real: 400, message: 'JSON inválido no corpo da requisição.', detalhes: e.message
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { id_ancora, novas_mesas, dados_reserva } = body;

      if (!id_ancora || !novas_mesas || !Array.isArray(novas_mesas) || !dados_reserva) {
        return new Response(JSON.stringify({
          success: false, status_code_real: 400, message: 'Campos obrigatórios: id_ancora, novas_mesas, dados_reserva.'
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: ancora, error: ancoraError } = await supabaseClient
        .from('reservas')
        .select('numero_reserva, data_reserva, nome_cliente, telefone_cliente')
        .eq('id', id_ancora)
        .single();

      if (ancoraError || !ancora) {
        return new Response(JSON.stringify({
          success: false, status_code_real: 404, message: 'Reserva âncora não encontrada.'
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      const { numero_reserva, nome_cliente, telefone_cliente } = ancora;
      const nova_data_reserva = dados_reserva.data_reserva || ancora.data_reserva;

      const { data: conflitos, error: conflitosError } = await supabaseClient
        .from('reservas')
        .select('id_mesa')
        .eq('data_reserva', nova_data_reserva)
        .in('id_mesa', novas_mesas)
        .not('numero_reserva', 'eq', numero_reserva)
        .in('status', STATUS_ATIVOS);

      if (conflitosError) throw conflitosError;

      if (conflitos && conflitos.length > 0) {
        const mesasOcupadas = conflitos.map(c => c.id_mesa).join(', ');
        return new Response(JSON.stringify({
          success: false, status_code_real: 409, message: `Conflito: As seguintes mesas já estão reservadas por outro grupo: ${mesasOcupadas}`
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { error: deleteError } = await supabaseClient
        .from('reservas')
        .delete()
        .eq('numero_reserva', numero_reserva);

      if (deleteError) throw deleteError;

      const reservasParaCriar = novas_mesas.map((mesaId) => ({
        id_mesa: mesaId,
        nome_cliente: dados_reserva.nome_cliente || nome_cliente,
        telefone_cliente: dados_reserva.telefone_cliente || telefone_cliente,
        data_reserva: nova_data_reserva,
        horario_reserva: dados_reserva.horario_reserva,
        observacoes: dados_reserva.observacoes,
        status: dados_reserva.status || 'pendente',
        numero_reserva: numero_reserva,
      }));

      const { data: novasReservas, error: errorCriar } = await supabaseClient
        .from('reservas')
        .insert(reservasParaCriar)
        .select();

      if (errorCriar) {
          throw new Error(`Falha ao criar novas reservas após deletar as antigas: ${errorCriar.message}`);
      }
      
      processWebhook(supabaseClient, WEBHOOK_EVENTS.RESERVA_ATUALIZADA, novasReservas);

      const primeiraReserva = novasReservas[0];
      const mesasDaReserva = novasReservas.map(r => r.id_mesa);
      const reservaAgrupada = {
          ...primeiraReserva,
          id_ancora: primeiraReserva.id,
          mesas: mesasDaReserva
      };
      delete reservaAgrupada.id_mesa;

      return new Response(JSON.stringify({
        message: 'Reserva modificada com sucesso',
        reserva: reservaAgrupada
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } 
    
    if (method === 'POST' && path === '/reservas/atualizar-status') {
        const { id, status } = await req.json();

        if (!id || !status) {
            return new Response(JSON.stringify({ success: false, status_code_real: 400, message: 'Campos obrigatórios: id, status.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (!['pendente', 'confirmada', 'cancelada'].includes(status)) {
            return new Response(JSON.stringify({ success: false, status_code_real: 400, message: 'Status inválido.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Encontrar o número do grupo a partir do ID âncora
        const { data: ancora, error: ancoraError } = await supabaseClient
            .from('reservas')
            .select('numero_reserva')
            .eq('id', id)
            .single();

        if (ancoraError || !ancora) {
            return new Response(JSON.stringify({ success: false, status_code_real: 404, message: 'Reserva âncora não encontrada.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { numero_reserva } = ancora;
        let updateData: Partial<Reserva> = { status };

        // Lógica especial para cancelamento
        if (status === 'cancelada') {
            updateData.id_mesa = null;
            // Nota: A atualização em massa não pode mover id_mesa para id_mesa_historico individualmente.
            // Apenas o status será atualizado em massa e id_mesa será definido como nulo.
        }

        // Atualizar todas as reservas do grupo
        const { data: reservasAtualizadas, error } = await supabaseClient
            .from('reservas')
            .update(updateData)
            .eq('numero_reserva', numero_reserva)
            .select();

        if (error) throw error;

        if (!reservasAtualizadas || reservasAtualizadas.length === 0) {
            return new Response(JSON.stringify({ success: false, status_code_real: 404, message: 'Nenhuma reserva encontrada para este grupo.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const event = status === 'cancelada' ? WEBHOOK_EVENTS.RESERVA_CANCELADA : WEBHOOK_EVENTS.RESERVA_ATUALIZADA;
        processWebhook(supabaseClient, event, reservasAtualizadas);

        return new Response(JSON.stringify({
            message: 'Grupo de reservas atualizado com sucesso',
            reservas: reservasAtualizadas
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // GET /status
    if (method === 'GET' && path === '/status') {
      return new Response(JSON.stringify({
        status: 'online',
        api_version: '1.3.0'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Endpoint não encontrado
    return new Response(JSON.stringify({
      success: false,
      status_code_real: 404,
      message: 'Endpoint não encontrado'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro na edge function:', error);
    return new Response(JSON.stringify({
      success: false,
      status_code_real: 500,
      message: 'Erro interno do servidor',
      detalhes: error.message
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});