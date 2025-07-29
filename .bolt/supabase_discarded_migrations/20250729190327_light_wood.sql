/*
  # Criar tabela de usuários

  1. Nova Tabela
    - `users`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `email` (text, unique, not null)
      - `created_at` (timestamptz, default now())

  2. Segurança
    - Habilitar RLS na tabela `users`
    - Adicionar políticas para usuários autenticados lerem e modificarem seus próprios dados
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);