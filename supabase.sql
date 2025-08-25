-- Schema
create table if not exists notes (
  id bigint generated always as identity primary key,
  y int not null,
  m int not null,  -- 0~11
  d int not null,  -- 1~31
  content text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create unique index if not exists notes_unique_date on notes(y, m, d);

create table if not exists presets (
  id bigint generated always as identity primary key,
  emoji text not null,
  label text not null,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists user_roles (
  id bigint generated always as identity primary key,
  user_id uuid,          -- supabase auth.user id (nullable if email-only control)
  email text,            -- convenient for granting by email
  role text not null check (role in ('editor')),
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table notes enable row level security;
alter table presets enable row level security;
alter table user_roles enable row level security;

-- Policies
-- Everyone can read notes/presets
create policy if not exists "notes_read_all"
  on notes for select
  using (true);

create policy if not exists "presets_read_all"
  on presets for select
  using (true);

-- Editors can write
create policy if not exists "notes_write_editor"
  on notes for insert with check (
    exists (
      select 1 from user_roles ur
      where ur.role='editor'
        and (
          ur.user_id = auth.uid()
          or (ur.email is not null and ur.email = auth.jwt() ->> 'email')
        )
    )
  );

create policy if not exists "notes_update_editor"
  on notes for update using (
    exists (
      select 1 from user_roles ur
      where ur.role='editor'
        and (
          ur.user_id = auth.uid()
          or (ur.email is not null and ur.email = auth.jwt() ->> 'email')
        )
    )
  );

create policy if not exists "notes_delete_editor"
  on notes for delete using (
    exists (
      select 1 from user_roles ur
      where ur.role='editor'
        and (
          ur.user_id = auth.uid()
          or (ur.email is not null and ur.email = auth.jwt() ->> 'email')
        )
    )
  );

create policy if not exists "presets_write_editor"
  on presets for insert with check (
    exists (
      select 1 from user_roles ur
      where ur.role='editor'
        and (
          ur.user_id = auth.uid()
          or (ur.email is not null and ur.email = auth.jwt() ->> 'email')
        )
    )
  );

create policy if not exists "presets_update_editor"
  on presets for update using (
    exists (
      select 1 from user_roles ur
      where ur.role='editor'
        and (
          ur.user_id = auth.uid()
          or (ur.email is not null and ur.email = auth.jwt() ->> 'email')
        )
    )
  );

create policy if not exists "presets_delete_editor"
  on presets for delete using (
    exists (
      select 1 from user_roles ur
      where ur.role='editor'
        and (
          ur.user_id = auth.uid()
          or (ur.email is not null and ur.email = auth.jwt() ->> 'email')
        )
    )
  );

-- Seed default presets
insert into presets (emoji, label, sort_order) values
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