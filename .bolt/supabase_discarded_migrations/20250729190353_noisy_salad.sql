/*
  # Criar tabela de logs de webhook

  1. Nova Tabela
    - `webhook_logs`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `config_id` (uuid, foreign key para webhook_config, nullable)
      - `event` (text, not null)
      - `success` (boolean, default false)
      - `error_message` (text, nullable)
      - `created_at` (timestamptz, default now())

  2. Índices
    - Índice para config_id
    - Índice para created_at (descendente)

  3. Relacionamentos
    - Foreign key para webhook_config com CASCADE DELETE

  4. Segurança
    - Habilitar RLS na tabela `webhook_logs`
    - Permitir usuários autenticados lerem logs
    - Permitir sistema inserir logs
*/

CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid REFERENCES webhook_config(id) ON DELETE CASCADE,
  event text NOT NULL,
  success boolean DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_webhook_logs_config_id 
  ON webhook_logs (config_id);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at 
  ON webhook_logs (created_at DESC);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read webhook logs"
  ON webhook_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert webhook logs"
  ON webhook_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);