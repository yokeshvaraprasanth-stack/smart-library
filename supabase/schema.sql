create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  student_id text not null unique,
  email text not null unique,
  phone text default '',
  role text not null default 'USER' check (role in ('USER', 'ADMIN')),
  created_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  category text not null,
  isbn text not null unique,
  description text default '',
  cover_url text,
  total_copies integer not null default 1 check (total_copies > 0),
  available_copies integer not null default 1 check (available_copies >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.borrowings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  borrowed_at timestamptz not null default now(),
  due_date timestamptz not null,
  returned_at timestamptz,
  status text not null default 'Active',
  fine_amount numeric(10,2) not null default 0
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, book_id)
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  reserved_at timestamptz not null default now(),
  status text not null default 'Pending'
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  );
$$;

grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.borrowings enable row level security;
alter table public.wishlists enable row level security;
alter table public.reservations enable row level security;
alter table public.notifications enable row level security;

create policy "profiles_select_self_or_admin" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles_insert_self" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_self_or_admin" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy "books_read_authenticated" on public.books for select to authenticated using (true);
create policy "books_admin_write" on public.books for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "borrowings_read_self_or_admin" on public.borrowings for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "borrowings_insert_self_or_admin" on public.borrowings for insert to authenticated with check (user_id = auth.uid() or public.is_admin());
create policy "borrowings_update_self_or_admin" on public.borrowings for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy "wishlists_self_or_admin" on public.wishlists for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "reservations_self_or_admin" on public.reservations for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "notifications_self_or_admin" on public.notifications for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, student_id, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'student_id', 'PENDING-' || substr(new.id::text, 1, 8)),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
