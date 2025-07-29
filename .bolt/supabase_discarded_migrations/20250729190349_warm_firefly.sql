/*
  # Criar tabela de configuração de webhook

  1. Nova Tabela
    - `webhook_config`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `endpoint_url` (text, not null)
      - `enabled` (boolean, default false)
      - `secret_key` (text, nullable)
      - `events` (text[], default ['reserva_criada'])
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Índices
    - Índice para campo enabled

  3. Segurança
    - Habilitar RLS na tabela `webhook_config`
    - Permitir usuários autenticados gerenciarem configurações de webhook
*/

CREATE TABLE IF NOT EXISTS webhook_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_url text NOT NULL,
  enabled boolean DEFAULT false,
  secret_key text,
  events text[] DEFAULT ARRAY['reserva_criada'::text],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índice para enabled
CREATE INDEX IF NOT EXISTS idx_webhook_config_enabled 
  ON webhook_config (enabled);

ALTER TABLE webhook_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage webhook config"
  ON webhook_config
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);