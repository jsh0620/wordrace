// 자동 감지가 실패했을 때만 보여주는 수동 선택 폴백 목록 (국가명/국기는 아래에서 동적으로 생성)
const FALLBACK_CODES = [
  'KR','US','JP','CN','GB','DE','FR','CA','AU','BR','IN','RU','ES','IT','MX','ID',
  'VN','TH','PH','TR','NL','SE','PL','AR','EG','SA','ZA','NG','PK','BD','IL','SG',
  'MY','NZ','UA'
];

const regionNames = (typeof Intl !== 'undefined' && Intl.DisplayNames)
  ? new Intl.DisplayNames(['ko'], { type: 'region' })
  : null;

function countryName(code) {
  if (!code) return code;
  try {
    return (regionNames && regionNames.of(code.toUpperCase())) || code;
  } catch (e) {
    return code;
  }
}

function flagEmoji(code) {
  if (!code || code.length !== 2) return '🏳️';
  const chars = [...code.toUpperCase()].map((c) => 0x1F1E6 - 65 + c.charCodeAt(0));
  return String.fromCodePoint(...chars);
}

async function detectCountryByIP() {
  try {
    const res = await fetch('https://ipwho.is/');
    const data = await res.json();
    if (data && data.success !== false && data.country_code) {
      return data.country_code.toUpperCase();
    }
  } catch (e) {
    // 네트워크 오류 등 — 폴백으로 넘어감
  }
  return null;
}

// 네트워크에서 불러오지 못했을 때만 쓰는 최소한의 예비 단어 목록
const FALLBACK_WORDS = [
  'apple','orange','banana','purple','yellow','silver','bridge','castle','forest','desert',
  'winter','summer','autumn','spring','planet','rocket','engine','harbor','island','valley',
  'canyon','tunnel','signal','camera','pencil','pillow','blanket','window','mirror','ladder',
  'basket','bottle','candle','feather','marble','ribbon','shadow','shelter','thunder','whisper',
];

// 구글 Trillion Word Corpus 기반 영단어 빈도 목록 (욕설 제거판, 정적 파일, CORS 허용)
const WORD_LIST_URL = 'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt';
const WORD_LIST_CACHE_KEY = 'wr-word-list-cache-v1';

let WORDS = FALLBACK_WORDS;

async function loadWordList() {
  try {
    const cached = localStorage.getItem(WORD_LIST_CACHE_KEY);
    if (cached) {
      const arr = JSON.parse(cached);
      if (Array.isArray(arr) && arr.length > 50) {
        WORDS = arr;
        return;
      }
    }
  } catch (e) { /* ignore */ }

  try {
    const res = await fetch(WORD_LIST_URL);
    const text = await res.text();
    const words = text
      .split('\n')
      .map((w) => w.trim().toLowerCase())
      .filter((w) => /^[a-z]{3,9}$/.test(w));
    if (words.length > 50) {
      WORDS = words;
      try {
        localStorage.setItem(WORD_LIST_CACHE_KEY, JSON.stringify(words));
      } catch (e) { /* 저장 공간 부족 등은 무시 */ }
    }
  } catch (e) {
    // 네트워크 실패 시 FALLBACK_WORDS를 계속 사용
  }
}

const LOCAL_KEY = 'wr-player-profile';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let countryCode = null;
let personalScore = 0;
let streak = 0;
let bestStreak = 0;
let currentWord = null;
let typed = '';
let leaderboard = {};

const el = {
  app: document.getElementById('app'),
  themeToggle: document.getElementById('theme-toggle'),
  countryBadge: document.getElementById('country-badge'),
  statScore: document.getElementById('stat-score'),
  statStreak: document.getElementById('stat-streak'),
  statBest: document.getElementById('stat-best'),
  wordDisplay: document.getElementById('word-display'),
  input: document.getElementById('word-input'),
  leaderboardList: document.getElementById('leaderboard-list'),
  pickerOverlay: document.getElementById('picker-overlay'),
  pickerTitle: document.getElementById('picker-title'),
  pickerDesc: document.getElementById('picker-desc'),
  countryGrid: document.getElementById('country-grid'),
};

function pickWord(exclude) {
  let w;
  do {
    w = WORDS[Math.floor(Math.random() * WORDS.length)];
  } while (w === exclude && WORDS.length > 1);
  return w;
}

function medal(idx) {
  if (idx === 0) return '🥇';
  if (idx === 1) return '🥈';
  if (idx === 2) return '🥉';
  return String(idx + 1);
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      countryCode = data.country || null;
      personalScore = data.score || 0;
      bestStreak = data.bestStreak || 0;
    }
  } catch (e) { /* ignore */ }
}

function saveProfile() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ country: countryCode, score: personalScore, bestStreak }));
  } catch (e) { /* ignore */ }
}

function renderTheme(theme) {
  el.app.dataset.theme = theme;
  el.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function renderCountryBadge() {
  if (!el.countryBadge) return;
  if (countryCode) {
    el.countryBadge.hidden = false;
    el.countryBadge.textContent = `${flagEmoji(countryCode)} ${countryName(countryCode)}`;
    el.countryBadge.title = 'IP 기반으로 자동 감지된 국가예요 (변경 불가)';
  } else {
    el.countryBadge.hidden = true;
  }
}

function renderStats() {
  el.statScore.textContent = personalScore.toLocaleString();
  if (el.statStreak) el.statStreak.textContent = `🔥 ${streak}`;
  if (el.statBest) el.statBest.textContent = bestStreak.toLocaleString();
}

function renderWord() {
  el.wordDisplay.innerHTML = '';
  for (let i = 0; i < currentWord.length; i++) {
    const span = document.createElement('span');
    span.className = 'wr-char';
    if (i < typed.length) {
      span.classList.add(typed[i].toLowerCase() === currentWord[i].toLowerCase() ? 'wr-char-correct' : 'wr-char-wrong');
    }
    span.textContent = currentWord[i];
    el.wordDisplay.appendChild(span);
  }
  el.input.maxLength = currentWord.length;
}

function flashWord(cls) {
  el.wordDisplay.classList.remove('wr-pop', 'wr-shake');
  void el.wordDisplay.offsetWidth;
  el.wordDisplay.classList.add(cls);
  setTimeout(() => el.wordDisplay.classList.remove(cls), 300);
}

function renderLeaderboard() {
  const entries = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);
  const maxScore = entries.length ? entries[0][1] : 0;
  el.leaderboardList.innerHTML = '';

  if (entries.length === 0) {
    const li = document.createElement('li');
    li.className = 'wr-lb-empty';
    li.textContent = '아직 기록이 없어요. 첫 기록을 남겨보세요!';
    el.leaderboardList.appendChild(li);
    return;
  }

  entries.forEach(([code, score], idx) => {
    const pct = maxScore ? (score / maxScore) * 100 : 0;
    const li = document.createElement('li');
    if (code === countryCode) li.classList.add('wr-lb-mine');
    li.innerHTML = `
      <span class="wr-lb-rank">${medal(idx)}</span>
      <span>${flagEmoji(code)}</span>
      <span class="wr-lb-name">${countryName(code)}</span>
      <div class="wr-lb-bar-track"><div class="wr-lb-bar" style="width:${pct}%"></div></div>
      <span class="wr-lb-score">${score.toLocaleString()}</span>
    `;
    el.leaderboardList.appendChild(li);
  });
}

function renderCountryGrid() {
  el.countryGrid.innerHTML = '';
  FALLBACK_CODES.forEach((code) => {
    const btn = document.createElement('button');
    btn.className = 'wr-country-btn';
    btn.innerHTML = `<span class="wr-flag-big">${flagEmoji(code)}</span><span>${countryName(code)}</span>`;
    btn.addEventListener('click', () => chooseCountry(code));
    el.countryGrid.appendChild(btn);
  });
}

function showFallbackPicker() {
  el.pickerOverlay.classList.add('wr-visible');
  el.input.disabled = true;
}

function hidePicker() {
  el.pickerOverlay.classList.remove('wr-visible');
  el.input.disabled = false;
  el.input.focus();
}

function chooseCountry(code) {
  countryCode = code;
  saveProfile();
  renderCountryBadge();
  renderLeaderboard();
  hidePicker();
}

async function fetchLeaderboard() {
  const { data, error } = await supabase.from('country_scores').select('*');
  if (error) {
    console.error('리더보드를 불러오지 못했습니다:', error);
    return;
  }
  leaderboard = {};
  data.forEach((row) => { leaderboard[row.country_code] = row.score; });
  renderLeaderboard();
}

async function bumpGlobalScore(code) {
  const { error } = await supabase.rpc('increment_country_score', { p_country_code: code });
  if (error) console.error('점수 반영 실패:', error);
}

function subscribeRealtime() {
  supabase
    .channel('country-scores-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'country_scores' }, () => {
      fetchLeaderboard();
    })
    .subscribe();
}

function handleInput(e) {
  const val = e.target.value;
  const isPrefixOk = currentWord.toLowerCase().startsWith(val.toLowerCase());
  typed = val;

  if (!isPrefixOk) {
    streak = 0;
    renderStats();
    renderWord();
    flashWord('wr-shake');
    return;
  }

  renderWord();

  if (val.length > 0 && val.toLowerCase() === currentWord.toLowerCase()) {
    personalScore += 1;
    streak += 1;
    bestStreak = Math.max(bestStreak, streak);
    renderStats();
    flashWord('wr-pop');
    saveProfile();
    if (countryCode) {
      leaderboard[countryCode] = (leaderboard[countryCode] || 0) + 1;
      renderLeaderboard();
      bumpGlobalScore(countryCode);
    }
    typed = '';
    el.input.value = '';
    currentWord = pickWord(currentWord);
    renderWord();
  }
}

async function init() {
  loadProfile();
  renderTheme('dark');
  renderCountryBadge();
  renderCountryGrid();
  el.input.placeholder = '단어 목록 불러오는 중...';

  el.input.addEventListener('input', handleInput);
  el.themeToggle.addEventListener('click', () => {
    renderTheme(el.app.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  fetchLeaderboard();
  subscribeRealtime();

  const tasks = [loadWordList()];
  if (!countryCode) {
    tasks.push(
      detectCountryByIP().then((detected) => {
        if (detected) {
          countryCode = detected;
          saveProfile();
          renderCountryBadge();
        }
      })
    );
  }
  await Promise.all(tasks);

  currentWord = pickWord();
  renderStats();
  renderWord();
  el.input.placeholder = '여기에 입력하세요';

  if (countryCode) {
    el.input.disabled = false;
    el.input.focus();
  } else {
    showFallbackPicker();
  }
}

init();