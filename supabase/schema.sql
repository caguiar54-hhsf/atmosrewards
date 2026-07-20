-- Run this once in the Supabase SQL editor for your project.

create table if not exists kv_store (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

alter table kv_store enable row level security;

-- Each signed-in user can only see and change their own rows.
create policy "individual read" on kv_store
  for select using (auth.uid() = user_id);

create policy "individual insert" on kv_store
  for insert with check (auth.uid() = user_id);

create policy "individual update" on kv_store
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "individual delete" on kv_store
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Profile photos: a public "avatars" bucket, one folder per user (named after
-- their user id), so anyone can view a photo but only its owner can upload,
-- replace, or delete it.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

