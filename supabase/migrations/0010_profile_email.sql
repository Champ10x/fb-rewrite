-- Denormalized email on profiles so the app can display it without querying
-- auth.users directly (not exposed via the client API).
alter table profiles add column if not exists email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, new.email = 'patrick@idealchamp.com')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;
