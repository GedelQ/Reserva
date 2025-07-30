import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface ReservaRequest {
  id_mesa?: number
  mesas?: number[]
  nome_cliente: string
  telefone_cliente: string
  data_reserva: string
  horario_reserva: string
  observacoes?: string
  status?: 'ativa' | 'cancelada' | 'finalizada' | 'pendente'
}

interface DisponibilidadeQuery {
  data_reserva: string
  horario_reserva?: string
  quantidade_mesas?: number
}

const LIMITE_MESAS = 30

// Usar Deno.serve em vez de serve
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    // Corrigir parsing da URL - pode vir com ou sem /functions/v1/
    let path = url.pathname
    
    // Remover possíveis prefixos
    if (path.startsWith('/functions/v1/reservas-api')) {
      path = path.replace('/functions/v1/reservas-api', '')
    } else if (path.startsWith('/reservas-api')) {
      path = path.replace('/reservas-api', '')
    }
    
    // Se o path estiver vazio, definir como raiz
    if (!path || path === '/') {
      path = '/status' // Redirecionar raiz para status
    }
    
    const method = req.method

    // Log para debug
    console.log('URL recebida:', req.url)
    console.log('Path original:', url.pathname)
    console.log('Path processado:', path)
    console.log('Method:', method)

    // GET /disponibilidade - Consultar disponibilidade
    if (method === 'GET' && path === '/disponibilidade') {
      const dataReserva = url.searchParams.get('data_reserva')
      const horarioReserva = url.searchParams.get('horario_reserva')
      const quantidadeMesas = parseInt(url.searchParams.get('quantidade_mesas') || '1')

      if (!dataReserva) {
        return new Response(
          JSON.stringify({ 
            error: 'Parâmetro data_reserva é obrigatório (formato: YYYY-MM-DD)' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Buscar reservas existentes para a data
      const { data: reservasExistentes, error: errorReservas } = await supabaseClient
        .from('reservas')
        .select('id_mesa, horario_reserva, nome_cliente')
        .eq('data_reserva', dataReserva)
        .eq('status', 'ativa')

      if (errorReservas) {
        return new Response(
          JSON.stringify({ error: 'Erro ao consultar reservas existentes' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Calcular disponibilidade
      const mesasOcupadas = reservasExistentes?.map(r => r.id_mesa) || []
      const totalMesasReservadas = reservasExistentes?.length || 0
      const mesasDisponiveis = LIMITE_MESAS - totalMesasReservadas
      const podeReservar = quantidadeMesas <= mesasDisponiveis

      // Gerar lista de mesas disponíveis (1-98, excluindo ocupadas)
      const todasMesas = Array.from({ length: 98 }, (_, i) => i + 1)
      const mesasLivres = todasMesas.filter(mesa => !mesasOcupadas.includes(mesa))

      // Agrupar reservas por horário se solicitado
      let disponibilidadePorHorario = null
      if (horarioReserva) {
        const reservasNoHorario = reservasExistentes?.filter(r => r.horario_reserva === horarioReserva) || []
        disponibilidadePorHorario = {
          horario: horarioReserva,
          mesas_ocupadas: reservasNoHorario.length,
          mesas_disponiveis: LIMITE_MESAS - reservasNoHorario.length,
          pode_reservar: quantidadeMesas <= (LIMITE_MESAS - reservasNoHorario.length)
        }
      }

      const response = {
        data_consulta: dataReserva,
        limite_mesas_por_dia: LIMITE_MESAS,
        total_mesas_reservadas: totalMesasReservadas,
        total_mesas_disponiveis: mesasDisponiveis,
        pode_reservar_quantidade: podeReservar,
        quantidade_solicitada: quantidadeMesas,
        mesas_disponiveis: mesasLivres, // Mostrar todas as mesas disponíveis
        total_mesas_livres: mesasLivres.length,
        disponibilidade_por_horario: disponibilidadePorHorario,
        horarios_disponiveis: [
          '18:00', '18:30', '19:00', '19:30', '20:00'
        ]
      }

      return new Response(
        JSON.stringify(response),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // GET /reservas - Listar reservas de uma data
    if (method === 'GET' && path === '/reservas') {
      const dataReserva = url.searchParams.get('data_reserva')
      const clienteNome = url.searchParams.get('cliente_nome')
      const clienteTelefone = url.searchParams.get('cliente_telefone')
      const mesa = url.searchParams.get('mesa')

      let query = supabaseClient
        .from('reservas')
        .select('*')
        .eq('status', 'ativa')
        .order('horario_reserva', { ascending: true })

      if (dataReserva) {
        query = query.eq('data_reserva', dataReserva)
      }

      if (clienteNome) {
        query = query.ilike('nome_cliente', `%${clienteNome}%`)
      }

      if (clienteTelefone) {
        const telefoneNumeros = clienteTelefone.replace(/\D/g, '')
        query = query.like('telefone_cliente', `%${telefoneNumeros}%`)
      }

      if (mesa) {
        query = query.eq('id_mesa', parseInt(mesa))
      }

      const { data: reservas, error } = await query

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar reservas' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({
          reservas: reservas || [],
          total: reservas?.length || 0,
          filtros_aplicados: {
            data_reserva: dataReserva,
            cliente_nome: clienteNome,
            cliente_telefone: clienteTelefone,
            mesa: mesa
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // POST /reservas - Criar nova reserva
    if (method === 'POST' && path === '/reservas') {
      const body: ReservaRequest = await req.json()

      // Validações básicas
      if (!body.nome_cliente || !body.telefone_cliente || !body.data_reserva || !body.horario_reserva) {
        return new Response(
          JSON.stringify({ 
            error: 'Campos obrigatórios: nome_cliente, telefone_cliente, data_reserva, horario_reserva' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Determinar mesas a reservar
      let mesasParaReservar: number[] = []
      if (body.mesas && body.mesas.length > 0) {
        mesasParaReservar = body.mesas
      } else if (body.id_mesa) {
        mesasParaReservar = [body.id_mesa]
      } else {
        return new Response(
          JSON.stringify({ 
            error: 'Deve especificar id_mesa ou mesas[]' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Verificar limite de mesas
      const { data: reservasExistentes, error: errorCount } = await supabaseClient
        .from('reservas')
        .select('id')
        .eq('data_reserva', body.data_reserva)
        .eq('status', 'ativa')

      if (errorCount) {
        return new Response(
          JSON.stringify({ error: 'Erro ao verificar limite de reservas' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const totalReservasExistentes = reservasExistentes?.length || 0
      if (totalReservasExistentes + mesasParaReservar.length > LIMITE_MESAS) {
        return new Response(
          JSON.stringify({ 
            error: `Limite de ${LIMITE_MESAS} mesas por dia seria ultrapassado. Atualmente: ${totalReservasExistentes} reservadas, solicitando: ${mesasParaReservar.length}`,
            limite_mesas: LIMITE_MESAS,
            mesas_ja_reservadas: totalReservasExistentes,
            mesas_solicitadas: mesasParaReservar.length,
            mesas_disponiveis: LIMITE_MESAS - totalReservasExistentes
          }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Verificar se as mesas específicas estão disponíveis
      const { data: mesasOcupadas, error: errorMesas } = await supabaseClient
        .from('reservas')
        .select('id_mesa')
        .eq('data_reserva', body.data_reserva)
        .eq('status', 'ativa')
        .in('id_mesa', mesasParaReservar)

      if (errorMesas) {
        return new Response(
          JSON.stringify({ error: 'Erro ao verificar disponibilidade das mesas' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (mesasOcupadas && mesasOcupadas.length > 0) {
        const mesasJaOcupadas = mesasOcupadas.map(m => m.id_mesa)
        return new Response(
          JSON.stringify({ 
            error: `Mesas já ocupadas: ${mesasJaOcupadas.join(', ')}`,
            mesas_ocupadas: mesasJaOcupadas,
            mesas_solicitadas: mesasParaReservar
          }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Criar reservas
      const reservasParaCriar = mesasParaReservar.map(mesa => ({
        id_mesa: mesa,
        nome_cliente: body.nome_cliente,
        telefone_cliente: body.telefone_cliente,
        data_reserva: body.data_reserva,
        horario_reserva: body.horario_reserva,
        observacoes: body.observacoes || '',
        status: body.status || 'ativa' // Usar o status do body ou 'ativa' como fallback
      }))
      console.log('Reservas para criar na Edge Function:', reservasParaCriar);

      const { data: novasReservas, error: errorCriar } = await supabaseClient
        .from('reservas')
        .insert(reservasParaCriar)
        .select()

      if (errorCriar) {
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao criar reservas',
            detalhes: errorCriar.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({
          message: 'Reservas criadas com sucesso',
          reservas_criadas: novasReservas?.length || 0,
          mesas_reservadas: mesasParaReservar,
          reservas: novasReservas,
          cliente: {
            nome: body.nome_cliente,
            telefone: body.telefone_cliente
          },
          detalhes: {
            data: body.data_reserva,
            horario: body.horario_reserva,
            observacoes: body.observacoes
          }
        }),
        { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // PUT /reservas/:id - Atualizar reserva
    if (method === 'PUT' && path.startsWith('/reservas/')) {
      const reservaId = path.split('/')[2]
      const body = await req.json()

      const { data: reservaAtualizada, error } = await supabaseClient
        .from('reservas')
        .update(body)
        .eq('id', reservaId)
        .eq('status', 'ativa')
        .select()

      if (error) {
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao atualizar reserva',
            detalhes: error.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (!reservaAtualizada || reservaAtualizada.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Reserva não encontrada' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({
          message: 'Reserva atualizada com sucesso',
          reserva: reservaAtualizada[0]
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // DELETE /reservas/:id - Cancelar reserva
    if (method === 'DELETE' && path.startsWith('/reservas/')) {
      const reservaId = path.split('/')[2]

      const { data: reservaCancelada, error } = await supabaseClient
        .from('reservas')
        .update({ status: 'cancelada' })
        .eq('id', reservaId)
        .eq('status', 'ativa')
        .select()

      if (error) {
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao cancelar reserva',
            detalhes: error.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (!reservaCancelada || reservaCancelada.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Reserva não encontrada ou já cancelada' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({
          message: 'Reserva cancelada com sucesso',
          reserva: reservaCancelada[0]
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // GET /status - Status da API
    if (method === 'GET' && path === '/status') {
      return new Response(
        JSON.stringify({
          status: 'online',
          api_version: '1.0.0',
          timestamp: new Date().toISOString(),
          endpoints: {
            'GET /disponibilidade': 'Consultar disponibilidade de mesas',
            'GET /reservas': 'Listar reservas com filtros',
            'POST /reservas': 'Criar nova reserva',
            'PUT /reservas/:id': 'Atualizar reserva existente',
            'DELETE /reservas/:id': 'Cancelar reserva',
            'GET /status': 'Status da API'
          },
          limite_mesas_por_dia: LIMITE_MESAS,
          horarios_disponiveis: [
            '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
          ]
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Endpoint não encontrado
    return new Response(
      JSON.stringify({ 
        error: 'Endpoint não encontrado',
        path_recebido: path,
        method_recebido: method,
        url_completa: req.url,
        endpoints_disponiveis: [
          'GET /disponibilidade',
          'GET /reservas', 
          'POST /reservas',
          'PUT /reservas/:id',
          'DELETE /reservas/:id',
          'GET /status'
        ]
      }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na edge function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        detalhes: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})