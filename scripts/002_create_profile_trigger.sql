-- Create trigger to auto-create profiles on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Create organization first if it doesn't exist
  insert into public.organizations (name, slug)
  values (
    coalesce(new.raw_user_meta_data ->> 'organization_name', 'My Organization'),
    coalesce(new.raw_user_meta_data ->> 'organization_slug', 'my-org-' || substr(new.id::text, 1, 8))
  )
  on conflict (slug) do nothing;

  -- Create profile linked to the organization
  insert into public.profiles (
    id, 
    organization_id, 
    first_name,
    last_name,
    full_name, 
    role, 
    email
  )
  values (
    new.id,
    (select id from public.organizations where slug = coalesce(new.raw_user_meta_data ->> 'organization_slug', 'my-org-' || substr(new.id::text, 1, 8))),
    coalesce(new.raw_user_meta_data ->> 'first_name', split_part(split_part(new.email, '@', 1), '.', 1)),
    coalesce(new.raw_user_meta_data ->> 'last_name', split_part(split_part(new.email, '@', 1), '.', 2)),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'admin', -- All signups are admin since only admins can create accounts
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
