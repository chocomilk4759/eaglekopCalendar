
create table public.notes (
  id bigserial not null,
  y integer not null,
  m integer not null,
  d integer not null,
  content text not null default ''::text,
  updated_at timestamp with time zone not null default now(),
  updated_by uuid null,
  items jsonb not null default '[]'::jsonb,
  is_rest boolean not null default false,
  color text null,
  constraint notes_pkey primary key (id),
  constraint notes_color_check check ((color = any (array['red'::text, 'blue'::text])))
) TABLESPACE pg_default;

create unique INDEX IF not exists notes_unique_date on public.notes using btree (y, m, d) TABLESPACE pg_default;

create table public.presets (
  id bigserial not null,
  emoji text not null,
  label text not null,
  sort_order integer not null default 0,
  updated_at timestamp with time zone not null default now(),
  updated_by uuid null,
  constraint presets_pkey primary key (id)
) TABLESPACE pg_default;

create table public.undated_items (
  id bigserial not null,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamp with time zone not null default now(),
  updated_by uuid null,
  constraint undated_items_pkey primary key (id)
) TABLESPACE pg_default;

alter table public.notes enable row level security;
alter table public.presets enable row level security;
alter table public.undated_items enable row level security;

-- ✅ 여기서부터 정책을 "드롭 후 생성" 방식으로 적용

-- notes (read)
drop policy if exists notes_read_all on public.notes;
create policy notes_read_all on public.notes
  for select using (true);

-- notes (write/update/delete) - 로그인 사용자만 허용
drop policy if exists notes_write_auth on public.notes;
create policy notes_write_auth on public.notes
  for insert with check (auth.role() = 'authenticated');

drop policy if exists notes_update_auth on public.notes;
create policy notes_update_auth on public.notes
  for update using (auth.role() = 'authenticated');

drop policy if exists notes_delete_auth on public.notes;
create policy notes_delete_auth on public.notes
  for delete using (auth.role() = 'authenticated');

-- presets (read)
drop policy if exists presets_read_all on public.presets;
create policy presets_read_all on public.presets
  for select using (true);

-- presets (write/update/delete) - 로그인 사용자만 허용
drop policy if exists presets_write_auth on public.presets;
create policy presets_write_auth on public.presets
  for insert with check (auth.role() = 'authenticated');

drop policy if exists presets_update_auth on public.presets;
create policy presets_update_auth on public.presets
  for update using (auth.role() = 'authenticated');

drop policy if exists presets_delete_auth on public.presets;
create policy presets_delete_auth on public.presets
  for delete using (auth.role() = 'authenticated');

-- undated_items (read)
drop policy if exists undated_items_read_all on public.undated_items;
create policy undated_items_read_all on public.undated_items
  for select using (true);

-- undated_items (write/update/delete) - 로그인 사용자만 허용
drop policy if exists undated_items_write_auth on public.undated_items;
create policy undated_items_write_auth on public.undated_items
  for insert with check (auth.role() = 'authenticated');

drop policy if exists undated_items_update_auth on public.undated_items;
create policy undated_items_update_auth on public.undated_items
  for update using (auth.role() = 'authenticated');

drop policy if exists undated_items_delete_auth on public.undated_items;
create policy undated_items_delete_auth on public.undated_items
  for delete using (auth.role() = 'authenticated');

INSERT INTO "public"."presets" ("id", "emoji", "label", "sort_order", "updated_at", "updated_by") VALUES ('1', '📢', '공지사항·중대발표', '10', '2025-08-26 09:31:25.72677+00', null), ('2', '🔔', '알림', '20', '2025-08-26 09:31:25.72677+00', null), ('3', '⚽', '축구 입중계 일정', '30', '2025-08-26 09:31:25.72677+00', null), ('4', '⚾', '야구 입중계 일정', '40', '2025-08-26 09:31:25.72677+00', null), ('5', '🏁', 'F1 입중계 일정', '50', '2025-08-26 09:31:25.72677+00', null), ('6', '🥎', '촌지', '60', '2025-08-26 09:31:25.72677+00', null), ('7', '🏆', '대회', '70', '2025-08-26 09:31:25.72677+00', null), ('8', '🎮', '게임', '80', '2025-08-26 09:31:25.72677+00', null), ('9', '📺', '같이보기', '90', '2025-08-26 09:31:25.72677+00', null), ('10', '🤼‍♂️', '합방', '100', '2025-08-26 09:31:25.72677+00', null), ('12', '👄', '저챗노가리', '110', '2025-08-26 12:31:43.70673+00', null), ('13', '🍚', '광고', '120', '2025-08-26 14:15:40.257751+00', null), ('14', '🎤', '노래방', '130', '2025-08-26 14:20:09.918876+00', null);
INSERT INTO "public"."notes" ("id", "y", "m", "d", "content", "updated_at", "updated_by", "items", "is_rest", "color") VALUES ('11', '2025', '7', '15', '광복절', '2025-08-26 12:52:51.906885+00', null, '[{"text":"🎮 더쇼25","emoji":"🎮","label":"게임"},{"text":"⚽ 리버풀 vs 본머스 04:00+1","emoji":"⚽","label":"축구 입중계 일정"}]', 'false', null), ('12', '2025', '7', '26', '휴방', '2025-08-26 12:53:06.691293+00', null, '[]', 'false', 'red'), ('15', '2025', '7', '29', '', '2025-08-26 12:54:02.0377+00', null, '[{"text":"📺 귀멸의 칼날","emoji":"📺","label":"같이보기"}]', 'false', null), ('16', '2025', '7', '30', '', '2025-08-26 12:55:46.72082+00', null, '[{"text":"📺 귀멸의 칼날","emoji":"📺","label":"같이보기"},{"text":"⚽ 첼시 vs 풀럼 20:30","emoji":"⚽","label":"축구 입중계 일정"}]', 'false', null), ('17', '2025', '7', '31', '', '2025-08-26 12:56:13.697416+00', null, '[{"text":"🏁 네덜란드 GP","emoji":"🏁","label":"F1 입중계 일정"},{"text":"⚽ 리버풀 vs 아스널 00:30+1","emoji":"⚽","label":"축구 입중계 일정"}]', 'false', null), ('18', '2025', '7', '9', '휴방', '2025-08-26 14:13:50.343152+00', null, '[]', 'false', 'red'), ('19', '2025', '7', '7', '휴방', '2025-08-26 14:13:59.249813+00', null, '[]', 'false', 'red'), ('20', '2025', '7', '4', '휴방', '2025-08-26 14:14:06.440216+00', null, '[]', 'false', 'red'), ('21', '2025', '7', '12', '휴방', '2025-08-26 14:14:14.55666+00', null, '[]', 'false', 'red'), ('22', '2025', '7', '19', '휴방', '2025-08-26 14:14:20.848752+00', null, '[]', 'false', 'red'), ('23', '2025', '7', '18', '휴방', '2025-08-26 14:14:26.94345+00', null, '[]', 'false', 'red'), ('24', '2025', '7', '1', '', '2025-08-26 14:15:03.73828+00', null, '[{"text":"👄 강황여자 2주년","emoji":"👄","label":"IRL"}]', 'false', null), ('25', '2025', '7', '2', '마비노기 멤버 : 짬타수아, 소니쇼', '2025-08-26 14:15:49.175089+00', null, '[{"text":"🍚 마비노기","emoji":"🍚","label":"광고"},{"text":"🎮 더쇼25","emoji":"🎮","label":"게임"}]', 'false', null), ('26', '2025', '7', '3', '', '2025-08-26 14:17:46.137054+00', null, '[{"text":"🏁 헝가리 GP","emoji":"🏁","label":"F1 입중계 일정"},{"text":"👄 영도 노가리","emoji":"👄","label":"IRL"}]', 'false', null), ('27', '2025', '7', '5', '', '2025-08-26 14:18:09.61185+00', null, '[{"text":"👄 영도 노가리","emoji":"👄","label":"IRL"},{"text":"🎮 더쇼25","emoji":"🎮","label":"게임"}]', 'false', null), ('28', '2025', '7', '6', '', '2025-08-26 14:18:32.946441+00', null, '[{"text":"👄 잠깐 노가리","emoji":"👄","label":"IRL"},{"text":"🎮 더쇼25","emoji":"🎮","label":"게임"}]', 'false', null), ('29', '2025', '7', '8', '', '2025-08-26 14:19:04.154078+00', null, '[{"text":"🎮 F1 MANAGER","emoji":"🎮","label":"게임"}]', 'false', null), ('30', '2025', '7', '11', '세트리스트 짜기', '2025-08-26 14:20:18.469399+00', null, '[{"text":"🎤 노인코래방","emoji":"🎤","label":"노래방"}]', 'false', null), ('32', '2025', '7', '10', '', '2025-08-26 14:21:46.419216+00', null, '[{"text":"👄 영도 노가리","emoji":"👄","label":"IRL"},{"text":"⚽ 팰리스 vs 리버풀 23:00","emoji":"⚽","label":"축구 입중계 일정"}]', 'false', null), ('33', '2025', '7', '13', 'SF자이언츠 마무리 투수 키우기', '2025-08-26 14:22:49.196458+00', null, '[{"text":"🎮 더쇼25","emoji":"🎮","label":"게임"}]', 'false', null), ('34', '2025', '7', '14', '', '2025-08-26 14:23:07.617816+00', null, '[{"text":"🎮 포트리스","emoji":"🎮","label":"게임"},{"text":"🎮 겟앰프드","emoji":"🎮","label":"게임"}]', 'false', null), ('35', '2025', '7', '16', '과외 멤버 : 디디디용', '2025-08-26 14:24:29.073209+00', null, '[{"text":"🤼‍♂️ 맨시티 과외","emoji":"🤼‍♂️","label":"합방"},{"text":"⚽ 애스턴 빌라 vs 뉴캐슬 20:30","emoji":"⚽","label":"축구 입중계 일정"},{"text":"⚽ 토트넘 vs 번리 23:00","emoji":"⚽","label":"축구 입중계 일정"},{"text":"⚽ 울버햄튼 vs 맨시티 01:30+1","emoji":"⚽","label":"축구 입중계 일정","emojiOnly":false}]', 'false', null), ('36', '2025', '7', '17', '', '2025-08-26 14:27:27.742685+00', null, '[{"text":"👄 영도 노가리","emoji":"👄","label":"IRL"},{"text":"⚽ 첼시 vs 팰리스 22:00","emoji":"⚽","label":"축구 입중계 일정"},{"text":"⚽ 맨유 vs 아스널 00:30+1","emoji":"⚽","label":"축구 입중계 일정"}]', 'false', null), ('37', '2025', '7', '20', '', '2025-08-26 14:28:50.735334+00', null, '[{"text":"🎮 더쇼25","emoji":"🎮","label":"게임"}]', 'false', null), ('38', '2025', '7', '21', '얍얍팀 선발전', '2025-08-26 14:29:11.976232+00', null, '[{"text":"🤼‍♂️ 치스티벌 오버쿡드2","emoji":"🤼‍♂️","label":"합방"}]', 'false', null), ('39', '2025', '7', '22', '', '2025-08-26 14:29:36.41971+00', null, '[{"text":"👄 25-26 유니폼 보기","emoji":"👄","label":"IRL"},{"text":"⚽ 웨스트햄 vs 첼시 04:00+1","emoji":"⚽","label":"축구 입중계 일정"}]', 'false', null), ('40', '2025', '7', '23', '', '2025-08-26 14:31:47.894175+00', null, '[{"text":"⚽ 맨시티 vs 토트넘 20:30","emoji":"⚽","label":"축구 입중계 일정"},{"text":"⚽ 번리 vs 선덜랜드 23:00","emoji":"⚽","label":"축구 입중계 일정"},{"text":"⚽ 아스널 vs 리즈 01:30+1","emoji":"⚽","label":"축구 입중계 일정"}]', 'false', null), ('41', '2025', '7', '24', '', '2025-08-26 14:33:13.038047+00', null, '[{"text":"⚽ 풀럼 vs 맨유 00:30+1","emoji":"⚽","label":"축구 입중계 일정"},{"text":"👄 후열 노가리","emoji":"👄","label":"IRL"}]', 'false', null), ('42', '2025', '7', '25', '', '2025-08-26 14:34:04.026419+00', null, '[{"text":"🎮 GEOGUESSR","emoji":"🎮","label":"게임"},{"text":"⚽ 뉴캐슬 vs 리버풀 04:00+1","emoji":"⚽","label":"축구 입중계 일정"}]', 'false', null), ('46', '2025', '6', '27', '', '2025-08-27 09:22:23.510676+00', null, '[{"text":"🎤 탑골 노래방","emoji":"🎤","label":"노래방","emojiOnly":false},{"text":"🏁 벨기에 GP","emoji":"🏁","label":"F1 입중계 일정","emojiOnly":false},{"text":"🎮 더쇼25","emoji":"🎮","label":"게임","emojiOnly":false}]', 'false', null), ('47', '2025', '6', '30', '', '2025-08-27 09:22:38.081609+00', null, '[{"text":"👄 통나무 파워 검사","emoji":"👄","label":"저챗노가리","emojiOnly":false}]', 'false', null), ('48', '2025', '6', '26', '멤버 : 모라라, 해블린, 연리, 유봄냥', '2025-08-27 09:24:04.016812+00', null, '[{"text":"🤼‍♂️ 하다가 노가리","emoji":"🤼‍♂️","label":"합방","emojiOnly":false}]', 'false', null), ('49', '2025', '6', '25', '', '2025-08-27 09:24:24.842726+00', null, '[{"text":"👄 예열 노가리","emoji":"👄","label":"저챗노가리","emojiOnly":false},{"text":"🎮 더쇼25","emoji":"🎮","label":"게임","emojiOnly":false}]', 'false', null), ('50', '2025', '6', '23', '', '2025-08-27 09:26:11.708882+00', null, '[{"text":"🎮 더쇼25","emoji":"🎮","label":"게임","emojiOnly":false}]', 'false', null), ('51', '2025', '6', '22', '', '2025-08-27 09:26:18.782841+00', null, '[{"text":"🎮 더쇼25","emoji":"🎮","label":"게임","emojiOnly":false}]', 'false', null), ('52', '2025', '6', '21', '멤버 : 금휘, 레드, 후추', '2025-08-27 09:26:28.20041+00', null, '[{"text":"🤼‍♂️ PEAK","emoji":"🤼‍♂️","label":"합방","emojiOnly":false},{"text":"🎮 더쇼25","emoji":"🎮","label":"게임","emojiOnly":false}]', 'false', null), ('53', '2025', '6', '20', '멤버 : 티뭉, 에리스, 나츠키', '2025-08-27 09:26:57.296542+00', null, '[{"text":"🤼‍♂️ 오버쿡드2","emoji":"🤼‍♂️","label":"합방","emojiOnly":false},{"text":"🎮 FC온라인","emoji":"🎮","label":"게임","emojiOnly":false}]', 'false', null), ('54', '2025', '6', '19', '', '2025-08-27 09:27:31.841733+00', null, '[{"text":"👄 영도DAY","emoji":"👄","label":"저챗노가리","emojiOnly":false},{"text":"👄 아이돌 노가리","emoji":"👄","label":"저챗노가리","emojiOnly":false}]', 'false', null), ('55', '2025', '6', '17', '멤버 : 사모장, 김니디, 이치카 히비, 멍카롱', '2025-08-27 09:28:00.823812+00', null, '[{"text":"🤼‍♂️ 포트나이트","emoji":"🤼‍♂️","label":"합방","emojiOnly":false}]', 'false', null), ('56', '2025', '6', '15', '', '2025-08-27 09:30:21.354829+00', null, '[{"text":"⚽ 한국 VS 일본","emoji":"⚽","label":"축구 입중계 일정","emojiOnly":false},{"text":"👄 쁘더2 컷신 월드컵","emoji":"👄","label":"저챗노가리","emojiOnly":false}]', 'false', null), ('57', '2025', '6', '13', '멤버 : 짬타수아, 소니쇼', '2025-08-27 09:31:10.762287+00', null, '[{"text":"🍚 마비노기","emoji":"🍚","label":"광고","emojiOnly":false},{"text":"🎮 FC온라인","emoji":"🎮","label":"게임","emojiOnly":false}]', 'false', null), ('58', '2025', '6', '11', '', '2025-08-27 09:31:51.747737+00', null, '[{"text":"⚽ 한국vs홍콩","emoji":"⚽","label":"축구 입중계 일정","emojiOnly":false},{"text":"🎮 FC온라인","emoji":"🎮","label":"게임","emojiOnly":false}]', 'false', null), ('59', '2025', '6', '10', '멤버 : 연비니, 앵보, 델로략국, 김뿡', '2025-08-27 09:32:20.873944+00', null, '[{"text":"🤼‍♂️ 리매치","emoji":"🤼‍♂️","label":"합방","emojiOnly":false}]', 'false', null), ('60', '2025', '6', '9', '', '2025-08-27 09:32:54.457307+00', null, '[{"text":"🎮 FC온라인","emoji":"🎮","label":"게임","emojiOnly":false},{"text":"🎮 포트나이트","emoji":"🎮","label":"게임","emojiOnly":false}]', 'false', null), ('61', '2025', '6', '8', '상대 : 쌍베', '2025-08-27 09:33:21.879193+00', null, '[{"text":"📢 치지직 같이보기 파트너","emoji":"📢","label":"공지사항·중대발표","emojiOnly":false},{"text":"🎮 FC온라인 맞밸전","emoji":"🎮","label":"게임","emojiOnly":false}]', 'false', null), ('62', '2025', '6', '7', '', '2025-08-27 09:33:54.333535+00', null, '[{"text":"⚽ 한국VS중국","emoji":"⚽","label":"축구 입중계 일정","emojiOnly":false}]', 'false', null), ('63', '2025', '6', '6', '멤버 : 강지형, 쵸쵸우, 노돌리, 제황', '2025-08-27 09:34:39.794675+00', null, '[{"text":"🤼‍♂️ 치레동","emoji":"🤼‍♂️","label":"합방","emojiOnly":false}]', 'false', null), ('64', '2025', '6', '5', '치레동 연습', '2025-08-27 09:35:20.850269+00', null, '[{"text":"👄 예열","emoji":"👄","label":"저챗노가리","emojiOnly":false},{"text":"🎮 그란투리스모7","emoji":"🎮","label":"게임","emojiOnly":false}]', 'false', null), ('65', '2025', '6', '3', '포트나이트', '2025-08-27 09:36:24.461448+00', null, '[{"text":"🤼‍♂️ 오징어그라운드","emoji":"🤼‍♂️","label":"합방","emojiOnly":false}]', 'false', null), ('66', '2025', '6', '2', '치락실 : 텐가이', '2025-08-27 09:36:35.791224+00', null, '[{"text":"🤼‍♂️ 치락실","emoji":"🤼‍♂️","label":"합방","emojiOnly":false},{"text":"🤼‍♂️ 치피엘","emoji":"🤼‍♂️","label":"합방","emojiOnly":false}]', 'false', null), ('67', '2025', '6', '1', '치레동 연습
강사 : 신짱게이밍', '2025-08-27 09:38:04.372574+00', null, '[{"text":"🎮 그란투리스모7","emoji":"🎮","label":"게임","emojiOnly":false},{"text":"🤼‍♂️ 레이싱 기초 이론 배우기","emoji":"🤼‍♂️","label":"합방","emojiOnly":false}]', 'false', null);
