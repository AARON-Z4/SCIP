-- Run this in your Supabase SQL Editor to enable Google Auth integration.

-- 1. Make password_hash nullable to support OAuth users (who don't have passwords)
alter table public.profiles alter column password_hash drop not null;

-- 2. Create a function to handle new user creation from Supabase Auth
create or replace function public.handle_new_user()
returns trigger
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, role, password_hash)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'citizen',
    null
  )
  on conflict (id) do nothing; -- Handle potential race conditions
  return new;
end;
$$ language plpgsql;

-- 3. Create a trigger to automatically run the function on new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Done! Now when a user signs in with Google, their profile will be auto-created.
