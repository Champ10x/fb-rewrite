-- patrick@idealchamp.com must always remain an admin, regardless of how a
-- profile row is edited (API, admin panel, or a direct DB update).
create or replace function public.protect_primary_admin()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email = 'patrick@idealchamp.com' then
    new.is_admin := true;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_primary_admin_trigger on profiles;
create trigger protect_primary_admin_trigger
before insert or update on profiles
for each row execute function public.protect_primary_admin();
