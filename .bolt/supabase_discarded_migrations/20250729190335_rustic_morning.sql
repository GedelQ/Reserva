/*
  # Criar tabela de mesas

  1. Nova Tabela
    - `mesas`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `numero_mesa` (integer, not null)
      - `capacidade` (integer, not null)
      - `fileira` (integer, not null)
      - `disponivel` (boolean, default true)
      - `created_at` (timestamptz, default now())

  2. Índices
    - Índice único para combinação fileira + numero_mesa

  3. Segurança
    - Habilitar RLS na tabela `mesas`
    - Permitir leitura para usuários autenticados
    - Permitir atualização de disponibilidade para usuários autenticados
*/

CREATE TABLE IF NOT EXISTS mesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_mesa integer NOT NULL,
  capacidade integer NOT NULL,
  fileira integer NOT NULL,
  disponivel boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Criar índice único para fileira + numero_mesa
CREATE UNIQUE INDEX IF NOT EXISTS idx_mesas_fileira_numero 
  ON mesas (fileira, numero_mesa);

ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read mesas"
  ON mesas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update mesa availability"
  ON mesas
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);