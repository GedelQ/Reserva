/*
  # Setup for test user authentication

  1. Instructions
    - This migration provides setup instructions for creating the test user
    - The actual user creation must be done through Supabase Dashboard
    
  2. Manual Steps Required
    - Go to your Supabase Dashboard
    - Navigate to Authentication > Users
    - Click "Add user" 
    - Create user with email: admin@pizzaria.com
    - Set password: admin123
    - Confirm the user (set email_confirmed_at)
    
  3. Profile Setup
    - Creates a profile entry for the test user
    - Links to the auth.users table via foreign key
*/

-- Create a function to setup the test user profile once auth user is created
CREATE OR REPLACE FUNCTION setup_test_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Try to find the test user by email
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE email = 'admin@pizzaria.com';
  
  -- If user exists and profile doesn't exist, create it
  IF test_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, full_name, created_at)
    VALUES (test_user_id, 'Administrador', now())
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;

-- Note: This function can be called after creating the user in Supabase Dashboard
-- You can run: SELECT setup_test_user_profile(); in the SQL editor