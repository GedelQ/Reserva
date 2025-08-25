import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tipos TypeScript
export interface Reserva {
  id: string
  created_at: string
  numero_reserva: number
  id_mesa: number | null
  nome_cliente: string
  telefone_cliente: string
  data_reserva: string
  horario_reserva: string
  observacoes: string
  status: 'confirmada' | 'cancelada' | 'finalizada' | 'pendente'
  id_mesa_historico?: number | null
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
export const fetchReservas = async (filters?: { data_reserva?: string; nome_cliente?: string; telefone_cliente?: string; id_mesa?: number; id?: string, numero_reserva?: number }) => {
  try {
    let query = supabase
      .from('reservas')
      .select('*')
      .in('status', ['confirmada', 'pendente', 'cancelada'])
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
    
    if (filters?.id) {
      query = query.eq('id', filters.id)
    }

    if (filters?.numero_reserva) {
      query = query.eq('numero_reserva', filters.numero_reserva)
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
export const createReserva = async (reservaData: Omit<Reserva, 'id' | 'created_at' | 'numero_reserva'> & { mesas?: number[] }) => {
  try {
    const { data, error } = await supabase.functions.invoke('reservas-api', {
      body: reservaData,
    });

    if (error) {
      console.error('Erro ao criar reserva:', error);
      throw error;
    }

    return data.reservas;
  } catch (error) {
    console.error('Erro ao criar reserva (catch):', error);
    throw error;
  }
};

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
      .delete()
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
  const mesas: MesaLayout[] = [];
  const fileirasConfig = [
    { f: 1, m: 8, s: 1 }, { f: 2, m: 8, s: 16 }, { f: 3, m: 8, s: 17 }, { f: 4, m: 8, s: 32 },
    { f: 5, m: 8, s: 33 }, { f: 6, m: 8, s: 48 }, { f: 7, m: 10, s: 49 }, { f: 8, m: 10, s: 68 },
    { f: 9, m: 10, s: 69 }, { f: 10, m: 10, s: 88 }, { f: 11, m: 10, s: 89 },
  ];

  fileirasConfig.forEach(({ f: fileira, m: numMesas, s: startId }) => {
    for (let i = 0; i < numMesas; i++) {
      let mesaId;
      if (fileira % 2 === 0) {
        // Fileira par (decrescente)
        mesaId = startId - i;
      } else {
        // Fileira ímpar (crescente)
        mesaId = startId + i;
      }
      mesas.push({
        id: mesaId,
        capacidade: 4, // Capacidade padrão
        fileira: fileira,
        status: 'disponivel',
      });
    }
  });

  return mesas;
};