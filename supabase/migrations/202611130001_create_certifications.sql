create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  member_id text not null check (member_id in ('taem', 'sam', 'sook', 'yoom')),
  workout_date date not null,
  routine text not null check (char_length(routine) between 1 and 120),
  photo_path text not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, workout_date)
);

create index if not exists certifications_workout_date_idx
  on public.certifications (workout_date desc);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'certifications'
  ) then
    alter publication supabase_realtime add table public.certifications;
  end if;
end
$$;

alter table public.certifications enable row level security;

grant usage on schema public to anon, authenticated;
revoke all on public.certifications from anon, authenticated;
grant select, insert, update, delete on public.certifications to anon, authenticated;

drop policy if exists "certifications are publicly readable" on public.certifications;
create policy "certifications are publicly readable"
  on public.certifications
  for select
  to anon, authenticated
  using (true);

drop policy if exists "valid certifications can be created" on public.certifications;
create policy "valid certifications can be created"
  on public.certifications
  for insert
  to anon, authenticated
  with check (
    member_id in ('taem', 'sam', 'sook', 'yoom')
    and workout_date between current_date - 366 and current_date + 1
    and photo_path like member_id || '/' || workout_date::text || '/%'
  );

drop policy if exists "valid certifications can be updated" on public.certifications;
create policy "valid certifications can be updated"
  on public.certifications
  for update
  to anon, authenticated
  using (member_id in ('taem', 'sam', 'sook', 'yoom'))
  with check (
    member_id in ('taem', 'sam', 'sook', 'yoom')
    and workout_date between current_date - 366 and current_date + 1
    and photo_path like member_id || '/' || workout_date::text || '/%'
  );

drop policy if exists "certifications can be removed" on public.certifications;
create policy "certifications can be removed"
  on public.certifications
  for delete
  to anon, authenticated
  using (member_id in ('taem', 'sam', 'sook', 'yoom'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'certification-photos',
  'certification-photos',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "certification photos are publicly readable" on storage.objects;
create policy "certification photos are publicly readable"
  on storage.objects
  for select
  to public
  using (bucket_id = 'certification-photos');

drop policy if exists "valid certification photos can be uploaded" on storage.objects;
create policy "valid certification photos can be uploaded"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'certification-photos'
    and (storage.foldername(name))[1] in ('taem', 'sam', 'sook', 'yoom')
  );

drop policy if exists "certification photos can be replaced" on storage.objects;
create policy "certification photos can be replaced"
  on storage.objects
  for update
  to anon, authenticated
  using (
    bucket_id = 'certification-photos'
    and (storage.foldername(name))[1] in ('taem', 'sam', 'sook', 'yoom')
  )
  with check (
    bucket_id = 'certification-photos'
    and (storage.foldername(name))[1] in ('taem', 'sam', 'sook', 'yoom')
  );

drop policy if exists "certification photos can be removed" on storage.objects;
create policy "certification photos can be removed"
  on storage.objects
  for delete
  to anon, authenticated
  using (
    bucket_id = 'certification-photos'
    and (storage.foldername(name))[1] in ('taem', 'sam', 'sook', 'yoom')
  );