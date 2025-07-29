/*
  # Criar tabela de reservas

  1. Nova Tabela
    - `reservas`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `created_at` (timestamptz, default now())
      - `id_mesa` (integer, not null, check entre 1 e 98)
      - `data_reserva` (date, not null)
      - `horario_reserva` (time, not null)
      - `observacoes` (text, default '')
      - `status` (text, default 'ativa', check valores válidos)
      - `nome_cliente` (text, not null)
      - `telefone_cliente` (text, nullable)

  2. Constraints
    - Check para id_mesa entre 1 e 98
    - Check para status com valores válidos: 'ativa', 'cancelada', 'finalizada'

  3. Índices
    - Índice para data_reserva + horario_reserva
    - Índice para data_reserva + id_mesa
    - Índice para status

  4. Segurança
    - RLS desabilitado (conforme schema atual)
    - Política para usuários autenticados gerenciarem todas as reservas
*/

CREATE TABLE IF NOT EXISTS reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  id_mesa integer NOT NULL,
  data_reserva date NOT NULL,
  horario_reserva time NOT NULL,
  observacoes text DEFAULT ''::text,
  status text DEFAULT 'ativa'::text NOT NULL,
  nome_cliente text NOT NULL,
  telefone_cliente text
);

-- Adicionar constraints
ALTER TABLE reservas 
  ADD CONSTRAINT IF NOT EXISTS reservas_id_mesa_check 
  CHECK ((id_mesa >= 1) AND (id_mesa <= 98));

ALTER TABLE reservas 
  ADD CONSTRAINT IF NOT EXISTS reservas_status_check 
  CHECK (status = ANY (ARRAY['ativa'::text, 'cancelada'::text, 'finalizada'::text]));

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_reservas_data_horario 
  ON reservas (data_reserva, horario_reserva);

CREATE INDEX IF NOT EXISTS idx_reservas_data_mesa 
  ON reservas (data_reserva, id_mesa);

CREATE INDEX IF NOT EXISTS idx_reservas_status 
  ON reservas (status);

-- RLS está desabilitado conforme o schema atual
-- Mas vamos adicionar uma política para usuários autenticados
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage reservas"
  ON reservas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);