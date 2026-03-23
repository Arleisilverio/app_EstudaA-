-- 1. Remove os admins da lista de e-mails autorizados para professores
DELETE FROM public.authorized_professor_emails 
WHERE email IN ('arlei85@hotmail.com', 'arlei.se.silverio85@gmail.com');

-- 2. Garante que o cargo deles na tabela de perfis seja 'admin'
UPDATE public.profiles 
SET user_role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('arlei85@hotmail.com', 'arlei.se.silverio85@gmail.com')
);