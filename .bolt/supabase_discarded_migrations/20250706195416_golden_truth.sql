/*
  # Create test user for pizzaria system

  1. Authentication Setup
    - Creates a test user with email: admin@pizzaria.com
    - Sets password as: admin123
    - Creates corresponding profile entry

  2. Security
    - User will be created in auth.users table
    - Profile will be linked via foreign key
    - RLS policies already configured for profiles table

  Note: This migration creates a test user for development purposes.
  In production, users should be created through proper registration flow.
*/

-- Insert test user into auth.users table
-- Note: In a real Supabase environment, users are typically created through the Auth API
-- This is a development workaround to ensure the test credentials work

-- Create a profile entry for the test user
-- We'll use a fixed UUID for the test user to ensure consistency
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin@pizzaria.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Create corresponding profile
INSERT INTO profiles (
  id,
  full_name,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Administrador da Pizzaria',
  now()
) ON CONFLICT (id) DO NOTHING;