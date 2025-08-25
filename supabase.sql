-- notes
create table if not exists public.notes (
  id bigserial primary key,
  y int not null,
  m int not null,  -- 0~11
  d int not null,  -- 1~31
  content text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create unique index if not exists notes_unique_date on public.notes(y, m, d);

-- presets
create table if not exists public.presets (
  id bigserial primary key,
  emoji text not null,
  label text not null,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- user_roles
create table if not exists public.user_roles (
  id bigserial primary key,
  user_id uuid,
  email text,
  role text not null check (role in ('editor','admin','superadmin')),
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.notes enable row level security;
alter table public.presets enable row level security;
alter table public.user_roles enable row level security;

-- Read policies
drop policy if exists notes_read_all on public.notes;
create policy notes_read_all on public.notes for select using (true);

drop policy if exists presets_read_all on public.presets;
create policy presets_read_all on public.presets for select using (true);

drop policy if exists user_roles_read_all on public.user_roles;
create policy user_roles_read_all on public.user_roles for select using (true);

-- Write policies for roles: editor/admin/superadmin
drop policy if exists notes_write_roles on public.notes;
create policy notes_write_roles on public.notes for insert with check (
  exists (
    select 1 from public.user_roles ur
    where ur.role in ('editor','admin','superadmin')
      and (ur.user_id = auth.uid() or (ur.email is not null and ur.email = auth.jwt() ->> 'email'))
  )
);

drop policy if exists notes_update_roles on public.notes;
create policy notes_update_roles on public.notes for update using (
  exists (
    select 1 from public.user_roles ur
    where ur.role in ('editor','admin','superadmin')
      and (ur.user_id = auth.uid() or (ur.email is not null and ur.email = auth.jwt() ->> 'email'))
  )
);

drop policy if exists notes_delete_roles on public.notes;
create policy notes_delete_roles on public.notes for delete using (
  exists (
    select 1 from public.user_roles ur
    where ur.role in ('editor','admin','superadmin')
      and (ur.user_id = auth.uid() or (ur.email is not null and ur.email = auth.jwt() ->> 'email'))
  )
);

drop policy if exists presets_write_roles on public.presets;
create policy presets_write_roles on public.presets for insert with check (
  exists (
    select 1 from public.user_roles ur
    where ur.role in ('editor','admin','superadmin')
      and (ur.user_id = auth.uid() or (ur.email is not null and ur.email = auth.jwt() ->> 'email'))
  )
);

drop policy if exists presets_update_roles on public.presets;
create policy presets_update_roles on public.presets for update using (
  exists (
    select 1 from public.user_roles ur
    where ur.role in ('editor','admin','superadmin')
      and (ur.user_id = auth.uid() or (ur.email is not null and ur.email = auth.jwt() ->> 'email'))
  )
);

drop policy if exists presets_delete_roles on public.presets;
create policy presets_delete_roles on public.presets for delete using (
  exists (
    select 1 from public.user_roles ur
    where ur.role in ('editor','admin','superadmin')
      and (ur.user_id = auth.uid() or (ur.email is not null and ur.email = auth.jwt() ->> 'email'))
  )
);

-- Seed presets
insert into public.presets (emoji, label, sort_order) values
('📢', '공지사항·중대발표', 10),
('🔔', '알림', 20),
('⚽', '축구 입중계 일정', 30),
('⚾', '야구 입중계 일정', 40),
('🏁', 'F1 입중계 일정', 50),
('🥎', '촌지', 60),
('🏆', '이글콥 대회 출전당일', 70),
('🎮', '특정 게임 할 때', 80),
('📺', '같이보기', 90),
('🤼‍♂️', '합방', 100)
on conflict do nothing;