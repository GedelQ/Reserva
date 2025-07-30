import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tipos TypeScript
export interface Reserva {
  id: string
  created_at: string
  id_mesa: number
  nome_cliente: string
  telefone_cliente: string
  data_reserva: string
  horario_reserva: string
  observacoes: string
  status: 'ativa' | 'cancelada' | 'finalizada' | 'pendente'
  isOptimistic?: boolean
}

export interface Mesa {
  id: string
  numero_mesa: number
  capacidade: number
  fileira: number
  disponivel: boolean
  created_at: string
}

// Interface para o layout das mesas no frontend
export interface MesaLayout {
  id: number
  capacidade: number
  fileira: number
  status?: 'disponivel' | 'ocupada' | 'reservada'
  reserva?: Reserva
}

// Função para buscar reservas
export const fetchReservas = async (filters?: { data_reserva?: string; nome_cliente?: string; telefone_cliente?: string; id_mesa?: number }) => {
  try {
    let query = supabase
      .from('reservas')
      .select('*')
      .in('status', ['ativa', 'pendente'])
      .order('data_reserva', { ascending: true })
      .order('horario_reserva', { ascending: true })

    if (filters?.data_reserva) {
      query = query.eq('data_reserva', filters.data_reserva)
    }
    
    if (filters?.nome_cliente) {
      query = query.eq('nome_cliente', filters.nome_cliente)
    }
    
    if (filters?.telefone_cliente) {
      query = query.eq('telefone_cliente', filters.telefone_cliente)
    }
    
    if (filters?.id_mesa) {
      query = query.eq('id_mesa', filters.id_mesa)
    }

    const { data: reservas, error } = await query

    if (error) {
      console.error('Erro ao buscar reservas:', error)
      throw error
    }

    return reservas || []
  } catch (error) {
    console.error('Erro ao buscar reservas:', error)
    throw error
  }
}

// Função para criar reserva
export const createReserva = async (reservaData: Omit<Reserva, 'id' | 'created_at'>) => {
  try {
    const { data, error } = await supabase
      .from('reservas')
      .insert([reservaData])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar reserva:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Erro ao criar reserva:', error)
    throw error
  }
}

// Função para atualizar reserva
export const updateReserva = async (id: string, reservaData: Partial<Reserva>) => {
  try {
    const { data, error } = await supabase
      .from('reservas')
      .update(reservaData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar reserva:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Erro ao atualizar reserva:', error)
    throw error
  }
}

// Função para cancelar reserva
export const deleteReserva = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('reservas')
      .update({ status: 'cancelada' })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao cancelar reserva:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Erro ao cancelar reserva:', error)
    throw error
  }
}

// Função para buscar mesas
export const fetchMesas = async () => {
  try {
    const { data: mesas, error } = await supabase
      .from('mesas')
      .select('*')
      .order('fileira', { ascending: true })
      .order('numero_mesa', { ascending: true })

    if (error) {
      console.error('Erro ao buscar mesas:', error)
      throw error
    }

    return mesas || []
  } catch (error) {
    console.error('Erro ao buscar mesas:', error)
    throw error
  }
}

// Horários disponíveis para reserva
export const TIME_SLOTS = [
  '18:00', '18:30', '19:00', '19:30', '20:00'
]

// Função para gerar o layout das 98 mesas
export const generateMesasLayout = (): MesaLayout[] => {
  const mesas: MesaLayout[] = []
  let mesaId = 1

  // Primeiras 6 fileiras com 8 mesas cada (48 mesas)
  for (let fileira = 1; fileira <= 6; fileira++) {
    for (let posicao = 1; posicao <= 8; posicao++) {
      mesas.push({
        id: mesaId,
        capacidade: 4, // Capacidade padrão
        fileira: fileira,
        status: 'disponivel'
      })
      mesaId++
    }
  }

  // Próximas 5 fileiras com 10 mesas cada (50 mesas)
  for (let fileira = 7; fileira <= 11; fileira++) {
    for (let posicao = 1; posicao <= 10; posicao++) {
      mesas.push({
        id: mesaId,
        capacidade: 4, // Capacidade padrão
        fileira: fileira,
        status: 'disponivel'
      })
      mesaId++
    }
  }

  return mesas
}