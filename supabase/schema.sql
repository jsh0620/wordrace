-- 국가별 누적 점수 테이블
create table if not exists country_scores (
  country_code text primary key,
  score bigint not null default 0
);

-- RLS 활성화: 기본적으로 아무도 테이블에 직접 쓰기 불가
alter table country_scores enable row level security;

-- 누구나 읽기는 가능 (랭킹 공개)
create policy "Allow public read" on country_scores
  for select
  using (true);

-- 점수 증가 전용 함수 (security definer로 RLS 우회, 오직 +1 증가만 허용)
create or replace function increment_country_score(p_country_code text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into country_scores (country_code, score)
  values (p_country_code, 1)
  on conflict (country_code)
  do update set score = country_scores.score + 1;
$$;

-- anon(비로그인 클라이언트)이 이 함수만 호출 가능하도록 권한 부여
grant execute on function increment_country_score(text) to anon;

-- 실시간 구독을 위해 publication에 테이블 추가
alter publication supabase_realtime add table country_scores;
