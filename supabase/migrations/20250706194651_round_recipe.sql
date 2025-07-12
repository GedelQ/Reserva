/*
  # Criação da tabela de reservas para pizzaria

  1. Nova Tabela
    - `reservas`
      - `id` (uuid, chave primária)
      - `created_at` (timestamp)
      - `id_mesa` (integer) - Identificador da mesa (1-8)
      - `nome_cliente` (text) - Nome do cliente
      - `telefone_cliente` (text) - Telefone do cliente
      - `data_reserva` (date) - Data da reserva
      - `horario_reserva` (time) - Horário da reserva
      - `observacoes` (text) - Observações especiais
      - `status` (text) - Status da reserva (ativa, cancelada, finalizada)

  2. Segurança
    - Habilitar RLS na tabela `reservas`
    - Política para usuários autenticados poderem ler/escrever
    - Índices para otimizar consultas por data e mesa

  3. Dados de Teste
    - Inserir algumas reservas de exemplo
*/

CREATE TABLE IF NOT EXISTS reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  id_mesa integer NOT NULL CHECK (id_mesa >= 1 AND id_mesa <= 98),
  nome_cliente text NOT NULL,
  telefone_cliente text NOT NULL,
  data_reserva date NOT NULL,
  horario_reserva time NOT NULL,
  observacoes text DEFAULT '',
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'cancelada', 'finalizada'))
);

-- Habilitar RLS
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados
CREATE POLICY "Authenticated users can manage reservas"
  ON reservas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_reservas_data_mesa ON reservas (data_reserva, id_mesa);
CREATE INDEX IF NOT EXISTS idx_reservas_status ON reservas (status);
CREATE INDEX IF NOT EXISTS idx_reservas_data_horario ON reservas (data_reserva, horario_reserva);

-- Dados de teste
INSERT INTO reservas (id_mesa, nome_cliente, telefone_cliente, data_reserva, horario_reserva, observacoes, status)
VALUES 
  (1, 'João Silva', '(11) 99999-9999', CURRENT_DATE, '19:00', 'Aniversário - precisa de bolo', 'ativa'),
  (15, 'Maria Santos', '(11) 88888-8888', CURRENT_DATE, '20:00', 'Cliente VIP', 'ativa'),
  (32, 'Pedro Oliveira', '(11) 77777-7777', CURRENT_DATE, '18:30', '', 'ativa'),
  (50, 'Ana Costa', '(11) 66666-6666', CURRENT_DATE + 1, '19:30', 'Reserva para amanhã', 'ativa'),
  (78, 'Carlos Mendes', '(11) 55555-5555', CURRENT_DATE + 1, '20:30', 'Mesa para 4 pessoas', 'ativa');