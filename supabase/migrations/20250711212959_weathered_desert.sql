/*
  # Webhook Configuration Tables

  1. New Tables
    - `webhook_config`
      - `id` (uuid, primary key)
      - `endpoint_url` (text, webhook URL)
      - `enabled` (boolean, webhook active status)
      - `secret_key` (text, HMAC signature key)
      - `events` (text[], events to send)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `webhook_logs`
      - `id` (uuid, primary key)
      - `config_id` (uuid, foreign key to webhook_config)
      - `event` (text, event type)
      - `success` (boolean, delivery status)
      - `error_message` (text, error details if failed)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage webhook config
    - Add policies for system to log webhook attempts
*/

-- Create webhook_config table
CREATE TABLE IF NOT EXISTS webhook_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_url text NOT NULL,
  enabled boolean DEFAULT false,
  secret_key text,
  events text[] DEFAULT ARRAY['reserva_criada'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid REFERENCES webhook_config(id) ON DELETE CASCADE,
  event text NOT NULL,
  success boolean DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE webhook_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policies for webhook_config
CREATE POLICY "Authenticated users can manage webhook config"
  ON webhook_config
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for webhook_logs
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_webhook_config_enabled ON webhook_config(enabled);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_config_id ON webhook_logs(config_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);