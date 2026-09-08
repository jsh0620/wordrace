# 타자 월드컵 🌍

랜덤 영단어를 정확히 입력하면 점수가 1씩 오르고, 선택한 국가의 누적 점수도 함께 올라가는
전 세계 실시간 국가 대결 타자 게임입니다. 빌드 도구 없이 순수 HTML/CSS/JS로 만들어져
GitHub + Vercel로 바로 배포할 수 있습니다.

## 1. Supabase 설정 (국가별 점수 저장용 백엔드)

1. [supabase.com](https://supabase.com) 에서 새 프로젝트를 만듭니다.
2. 프로젝트의 **SQL Editor**로 이동해 `supabase/schema.sql` 내용을 그대로 붙여넣고 실행합니다.
   - `country_scores` 테이블, 점수 증가용 RPC 함수, RLS 정책, Realtime 설정이 한 번에 적용됩니다.
3. **Project Settings → API**에서 다음 두 값을 복사합니다.
   - `Project URL`
   - `anon public` API 키
4. 이 값을 `config.js` 파일에 붙여넣습니다.

```js
const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

> anon 키는 브라우저에 노출돼도 안전합니다. RLS 정책상 직접 쓰기는 막혀 있고,
> 점수 증가는 오직 `increment_country_score` 함수(항상 +1)로만 가능합니다.

## 2. GitHub에 올리기

```bash
git init
git add .
git commit -m "타자 월드컵 초기 버전"
git branch -M main
git remote add origin https://github.com/<사용자명>/<저장소명>.git
git push -u origin main
```

## 3. Vercel 배포

1. [vercel.com](https://vercel.com) 에서 New Project → 방금 만든 GitHub 저장소 선택
2. Framework Preset: **Other** (빌드 명령 없음, Output Directory는 루트 그대로 두면 됨)
3. Deploy 클릭 — 끝나면 `https://<프로젝트명>.vercel.app` 주소로 바로 접속 가능

이후 `config.js`만 수정하면(예: 다른 Supabase 프로젝트로 교체) 별도 빌드 없이 바로 반영됩니다.

## 파일 구성

```
index.html         메인 페이지
style.css          스타일 (다크/라이트 테마 포함)
app.js             게임 로직 + Supabase 연동
config.js          Supabase URL/키 (직접 채워야 함)
supabase/schema.sql  Supabase에서 실행할 SQL
```

## 참고

- 국가 선택과 개인 점수는 브라우저 `localStorage`에 저장됩니다 (기기별로 별도 유지).
- 국가별 누적 점수는 Supabase에 저장되며 전 세계 모든 방문자에게 공개됩니다.
- 다른 브라우저에서 접속한 사람의 점수는 Realtime 구독을 통해 자동으로 반영됩니다.
