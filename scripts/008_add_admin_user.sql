-- Add coolsami_uk@yahoo.com as admin user
INSERT INTO public.user_roles (email, role) 
VALUES ('coolsami_uk@yahoo.com', 'admin')
ON CONFLICT (email) DO UPDATE SET 
  role = EXCLUDED.role,
  updated_at = now();
