import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface CalendarProps {
  dataFiltro: string
  onDataChange: (data: string) => void
}

interface DiaComReserva {
  data: string
  totalReservas: number
}

const Calendar: React.FC<CalendarProps> = ({ dataFiltro, onDataChange }) => {
  const [mesAtual, setMesAtual] = useState(new Date(dataFiltro))
  const [diasComReservas, setDiasComReservas] = useState<DiaComReserva[]>([])
  const [loading, setLoading] = useState(false)

  // Buscar dias com reservas para o mês atual
  const buscarDiasComReservas = async (ano: number, mes: number) => {
    setLoading(true)
    try {
      const primeiroDia = new Date(ano, mes, 1).toISOString().split('T')[0]
      const ultimoDia = new Date(ano, mes + 1, 0).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('reservas')
        .select('data_reserva')
        .eq('status', 'ativa')
        .gte('data_reserva', primeiroDia)
        .lte('data_reserva', ultimoDia)

      if (error) {
        console.error('Erro ao buscar reservas:', error)
        return
      }

      // Agrupar por data e contar reservas
      const contadorPorData: Record<string, number> = {}
      data?.forEach(reserva => {
        const data = reserva.data_reserva
        contadorPorData[data] = (contadorPorData[data] || 0) + 1
      })

      const diasComReservasArray = Object.entries(contadorPorData).map(([data, total]) => ({
        data,
        totalReservas: total
      }))

      setDiasComReservas(diasComReservasArray)
    } catch (error) {
      console.error('Erro ao buscar dias com reservas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    buscarDiasComReservas(mesAtual.getFullYear(), mesAtual.getMonth())
  }, [mesAtual])

  const proximoMes = () => {
    const novoMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1)
    setMesAtual(novoMes)
  }

  const mesAnterior = () => {
    const novoMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1)
    setMesAtual(novoMes)
  }

  const irParaHoje = () => {
    const hoje = new Date()
    setMesAtual(hoje)
    onDataChange(hoje.toISOString().split('T')[0])
  }

  // Gerar dias do calendário
  const gerarDiasDoCalendario = () => {
    const ano = mesAtual.getFullYear()
    const mes = mesAtual.getMonth()
    
    const primeiroDia = new Date(ano, mes, 1)
    const ultimoDia = new Date(ano, mes + 1, 0)
    const primeiroDiaSemana = primeiroDia.getDay()
    
    const dias = []
    
    // Dias do mês anterior (para completar a primeira semana)
    for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
      const dia = new Date(ano, mes, -i)
      dias.push({
        data: dia,
        isCurrentMonth: false,
        dataString: dia.toISOString().split('T')[0]
      })
    }
    
    // Dias do mês atual
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const data = new Date(ano, mes, dia)
      dias.push({
        data,
        isCurrentMonth: true,
        dataString: data.toISOString().split('T')[0]
      })
    }
    
    // Dias do próximo mês (para completar a última semana)
    const diasRestantes = 42 - dias.length // 6 semanas × 7 dias
    for (let dia = 1; dia <= diasRestantes; dia++) {
      const data = new Date(ano, mes + 1, dia)
      dias.push({
        data,
        isCurrentMonth: false,
        dataString: data.toISOString().split('T')[0]
      })
    }
    
    return dias
  }

  const diasDoCalendario = gerarDiasDoCalendario()
  const hoje = new Date().toISOString().split('T')[0]
  
  const obterReservasParaDia = (dataString: string) => {
    return diasComReservas.find(d => d.data === dataString)?.totalReservas || 0
  }

  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header do Calendário */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {nomesMeses[mesAtual.getMonth()]} {mesAtual.getFullYear()}
          </h2>
          <button
            onClick={irParaHoje}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Hoje
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={mesAnterior}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={proximoMes}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600">Com reservas</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Data selecionada</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600">Hoje</span>
          </div>
        </div>
        {loading && (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
            <span>Carregando...</span>
          </div>
        )}
      </div>

      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {diasSemana.map(dia => (
          <div key={dia} className="p-2 text-center text-sm font-medium text-gray-600">
            {dia}
          </div>
        ))}
      </div>

      {/* Grade do calendário */}
      <div className="grid grid-cols-7 gap-1">
        {diasDoCalendario.map((item, index) => {
          const reservasNoDia = obterReservasParaDia(item.dataString)
          const isHoje = item.dataString === hoje
          const isSelecionado = item.dataString === dataFiltro
          const temReservas = reservasNoDia > 0

          return (
            <button
              key={index}
              onClick={() => onDataChange(item.dataString)}
              className={`
                relative p-2 h-12 text-sm rounded-lg transition-all duration-200 hover:scale-105
                ${!item.isCurrentMonth 
                  ? 'text-gray-300 hover:bg-gray-50' 
                  : 'text-gray-700 hover:bg-gray-100'
                }
                ${isSelecionado 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : ''
                }
                ${isHoje && !isSelecionado 
                  ? 'bg-yellow-100 text-yellow-800 font-semibold' 
                  : ''
                }
                ${temReservas && !isSelecionado && !isHoje
                  ? 'bg-red-50 border border-red-200' 
                  : ''
                }
              `}
              title={
                temReservas 
                  ? `${item.data.getDate()} - ${reservasNoDia} ${reservasNoDia === 1 ? 'reserva' : 'reservas'}`
                  : `${item.data.getDate()}`
              }
            >
              <span className="relative z-10">
                {item.data.getDate()}
              </span>
              
              {/* Indicador de reservas */}
              {temReservas && item.isCurrentMonth && (
                <div className={`
                  absolute top-1 right-1 w-2 h-2 rounded-full
                  ${isSelecionado 
                    ? 'bg-white' 
                    : isHoje 
                    ? 'bg-yellow-600' 
                    : 'bg-red-500'
                  }
                `}>
                </div>
              )}
              
              {/* Contador de reservas para dias com muitas reservas */}
              {reservasNoDia > 5 && item.isCurrentMonth && (
                <div className={`
                  absolute bottom-0 right-0 w-4 h-4 text-xs rounded-full flex items-center justify-center font-bold
                  ${isSelecionado 
                    ? 'bg-white text-blue-500' 
                    : isHoje 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-red-500 text-white'
                  }
                `}>
                  {reservasNoDia > 9 ? '9+' : reservasNoDia}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Resumo do mês */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-red-600">
              {diasComReservas.length}
            </p>
            <p className="text-sm text-gray-600">Dias com reservas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {diasComReservas.reduce((acc, dia) => acc + dia.totalReservas, 0)}
            </p>
            <p className="text-sm text-gray-600">Total de reservas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {Math.round((diasComReservas.length / new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).getDate()) * 100)}%
            </p>
            <p className="text-sm text-gray-600">Taxa de ocupação</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Calendar
