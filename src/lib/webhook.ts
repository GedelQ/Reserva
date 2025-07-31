import { supabase } from './supabase'
import { Reserva } from './supabase'

// 📍 ESTE É O ARQUIVO PRINCIPAL DO WEBHOOK
// Localização: src/lib/webhook.ts

interface WebhookConfig {
  id: string
  endpoint_url: string
  enabled: boolean
  secret_key?: string
  events: string[]
}

interface WebhookPayload {
  event: string
  timestamp: string
  data: {
    reserva?: Reserva
    reservas?: Reserva[]
    cliente: {
      nome: string
      telefone: string
    }
    mesas: number[]
    total_mesas: number
    [key: string]: any
  }
}

// Função para gerar assinatura HMAC-SHA256
const generateSignature = async (payload: string, secret: string): Promise<string> => {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return 'sha256=' + Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Função para enviar webhook
const sendWebhook = async (config: WebhookConfig, payload: WebhookPayload): Promise<boolean> => {
  try {
    const payloadString = JSON.stringify(payload)
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Pizzaria-Webhook/1.0',
      'X-Webhook-Event': payload.event,
      'X-Webhook-Timestamp': payload.timestamp
    }

    // Adicionar assinatura se houver secret key
    if (config.secret_key) {
      const signature = await generateSignature(payloadString, config.secret_key)
      headers['X-Webhook-Signature'] = signature
    }

    const response = await fetch(config.endpoint_url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(10000) // Timeout de 10 segundos
    })

    if (!response.ok) {
      console.error(`Webhook failed: ${response.status} - ${response.statusText}`)
      return false
    }

    console.log(`Webhook sent successfully to ${config.endpoint_url}`)
    return true
  } catch (error) {
    console.error('Error sending webhook:', error)
    return false
  }
}

// Função para registrar tentativa de webhook
const logWebhookAttempt = async (
  configId: string, 
  event: string, 
  success: boolean, 
  errorMessage?: string
) => {
  try {
    await supabase
      .from('webhook_logs')
      .insert([{
        config_id: configId,
        event,
        success,
        error_message: errorMessage,
        created_at: new Date().toISOString()
      }])
  } catch (error) {
    console.error('Error logging webhook attempt:', error)
  }
}

// Função principal para processar webhook
export const processWebhook = async (event: string, reserva: Reserva | Reserva[]): Promise<void> => {
  try {
    // Buscar configuração de webhook
    const { data: config, error } = await supabase
      .from('webhook_config')
      .select('*')
      .eq('enabled', true)
      .limit(1)

    if (error || !config || config.length === 0) {
      console.log('No active webhook configuration found')
      return
    }

    const webhookConfig = config[0]

    // Verificar se o evento está habilitado
    if (!webhookConfig.events.includes(event)) {
      console.log(`Event ${event} not configured for webhook`)
      return
    }

    // Determinar se é uma reserva única ou múltiplas
    const isMultiple = Array.isArray(reserva)
    const reservas = isMultiple ? reserva : [reserva]
    const primeiraReserva = reservas[0]
    
    // Preparar payload baseado no tipo
    const payload: WebhookPayload = isMultiple ? {
      event,
      timestamp: new Date().toISOString(),
      data: {
        reservas: reservas,
        cliente: {
          nome: primeiraReserva.nome_cliente,
          telefone: primeiraReserva.telefone_cliente
        },
        mesas: reservas.map(r => r.id_mesa),
        total_mesas: reservas.length,
        data_reserva: primeiraReserva.data_reserva,
        horario_reserva: primeiraReserva.horario_reserva,
        observacoes: primeiraReserva.observacoes
      }
    } : {
      event,
      timestamp: new Date().toISOString(),
      data: {
        reserva: primeiraReserva,
        cliente: {
          nome: primeiraReserva.nome_cliente,
          telefone: primeiraReserva.telefone_cliente
        },
        mesas: [primeiraReserva.id_mesa],
        total_mesas: 1
      }
    }

    // Enviar webhook
    const success = await sendWebhook(webhookConfig, payload)
    
    // Registrar tentativa
    await logWebhookAttempt(
      webhookConfig.id, 
      event, 
      success, 
      success ? undefined : 'Failed to send webhook'
    )

    // Retry em caso de falha (opcional)
    if (!success) {
      console.log(`Webhook failed for event ${event}, scheduling retry...`)
      // Aqui você poderia implementar um sistema de retry
      // Por exemplo, usando setTimeout ou uma fila de jobs
    }

  } catch (error) {
    console.error('Error processing webhook:', error)
  }
}

// Eventos disponíveis
export const WEBHOOK_EVENTS = {
  RESERVA_CRIADA: 'reserva_criada',
  RESERVA_ATUALIZADA: 'reserva_atualizada',
  RESERVA_CANCELADA: 'reserva_cancelada'
} as const

export type WebhookEvent = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS]