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
        const statusList = statusParam.split(',').map((s) => s.trim());
        query = query.in('status', statusList);
      } else {
        query = query.in('status', STATUS_ATIVOS);
      }

      const { data: reservas, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({
        reservas: reservas || [],
        total: reservas?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /reservas
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

      return new Response(JSON.stringify({
        message: 'Reservas criadas com sucesso',
        reservas: novasReservas
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PUT /reservas/:id
    if (method === 'PUT' && path.startsWith('/reservas/')) {
      const reservaId = path.split('/')[2];
      const body = await req.json();
      const { id, created_at, ...updateData } = body;

      const { data: reservaAtualizada, error } = await supabaseClient
        .from('reservas')
        .update(updateData)
        .eq('id', reservaId)
        .select();
      if (error) throw error;

      if (!reservaAtualizada || reservaAtualizada.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          status_code_real: 404,
          message: 'Reserva não encontrada'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Dispara o webhook sem bloquear a resposta
      processWebhook(supabaseClient, WEBHOOK_EVENTS.RESERVA_ATUALIZADA, reservaAtualizada[0]);

      return new Response(JSON.stringify({
        message: 'Reserva atualizada com sucesso',
        reserva: reservaAtualizada[0]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE /reservas/:id
    if (method === 'DELETE' && path.startsWith('/reservas/')) {
      const reservaId = path.split('/')[2];

      const { data: reservaExistente, error: fetchError } = await supabaseClient
        .from('reservas')
        .select('id, id_mesa, status')
        .eq('id', reservaId)
        .in('status', STATUS_ATIVOS)
        .single();

      if (fetchError || !reservaExistente) {
        return new Response(JSON.stringify({
          success: false,
          status_code_real: 404,
          message: 'Reserva não encontrada ou já estava cancelada'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const { data: reservaCancelada, error: updateError } = await supabaseClient
        .from('reservas')
        .update({
          status: 'cancelada',
          id_mesa_historico: reservaExistente.id_mesa,
          id_mesa: null,
        })
        .eq('id', reservaId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Dispara o webhook sem bloquear a resposta
      processWebhook(supabaseClient, WEBHOOK_EVENTS.RESERVA_CANCELADA, reservaCancelada);

      return new Response(JSON.stringify({
        message: 'Reserva cancelada com sucesso',
        reserva: reservaCancelada
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /status
    if (method === 'GET' && path === '/status') {
      return new Response(JSON.stringify({
        status: 'online',
        api_version: '1.2.0' // Versão incrementada
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