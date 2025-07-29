/*
  # Criar tabela profiles

  1. Nova Tabela
    - `profiles`
      - `id` (uuid, primary key, foreign key para auth.users)
      - `full_name` (text, nullable)
      - `avatar_url` (text, nullable)
      - `created_at` (timestamptz, default: now())

  2. Segurança
    - Habilitar RLS na tabela `profiles`
    - Políticas para usuários gerenciarem seu próprio perfil
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own profile."
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own profile."
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);