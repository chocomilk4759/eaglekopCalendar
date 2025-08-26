-- notes: 날짜별 메모
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

-- presets: 이모지 프리셋
create table if not exists public.presets (
  id bigserial primary key,
  emoji text not null,
  label text not null,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- RLS 활성화
alter table public.notes enable row level security;
alter table public.presets enable row level security;

-- 모두 읽기 허용
drop policy if exists notes_read_all on public.notes;
create policy notes_read_all on public.notes for select using (true);

drop policy if exists presets_read_all on public.presets;
create policy presets_read_all on public.presets for select using (true);

-- "로그인된 사용자"만 쓰기/수정/삭제 허용
drop policy if exists notes_write_auth on public.notes;
create policy notes_write_auth on public.notes
  for insert with check (auth.role() = 'authenticated');

drop policy if exists notes_update_auth on public.notes;
create policy notes_update_auth on public.notes
  for update using (auth.role() = 'authenticated');

drop policy if exists notes_delete_auth on public.notes;
create policy notes_delete_auth on public.notes
  for delete using (auth.role() = 'authenticated');

drop policy if exists presets_write_auth on public.presets;
create policy presets_write_auth on public.presets
  for insert with check (auth.role() = 'authenticated');

drop policy if exists presets_update_auth on public.presets;
create policy presets_update_auth on public.presets
  for update using (auth.role() = 'authenticated');

drop policy if exists presets_delete_auth on public.presets;
create policy presets_delete_auth on public.presets
  for delete using (auth.role() = 'authenticated');

-- 프리셋 기본 시드
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
