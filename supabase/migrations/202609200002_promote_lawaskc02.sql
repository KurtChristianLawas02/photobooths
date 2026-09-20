update public.profiles
set role = 'super_admin', updated_at = now()
where lower(email) = 'lawaskc02@gmail.com';

-- A super_admin is also treated as an admin by public.is_admin().
