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
    if (req.method === 'POST') {
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
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
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
        return new Response(JSON.stringify({
          reservas: [],
          total: 0
        }), {
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