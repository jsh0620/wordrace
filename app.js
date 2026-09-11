// 국가 선택 화면에 전 세계 모든 나라가 나오도록 쓰는 ISO 3166-1 alpha-2 국가 코드 전체 목록
const ALL_COUNTRY_CODES = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ',
  'CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ',
  'DE','DJ','DK','DM','DO','DZ',
  'EC','EE','EG','EH','ER','ES','ET',
  'FI','FJ','FK','FM','FO','FR',
  'GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY',
  'HK','HM','HN','HR','HT','HU',
  'ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT',
  'JE','JM','JO','JP',
  'KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ',
  'LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY',
  'MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ',
  'NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ',
  'OM',
  'PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY',
  'QA',
  'RE','RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ',
  'TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ',
  'UA','UG','UM','US','UY','UZ',
  'VA','VC','VE','VG','VI','VN','VU',
  'WF','WS',
  'YE','YT',
  'ZA','ZM','ZW',
];

const regionNames = (typeof Intl !== 'undefined' && Intl.DisplayNames)
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;

function countryName(code) {
  if (!code) return code;
  try {
    return (regionNames && regionNames.of(code.toUpperCase())) || code;
  } catch (e) {
    return code;
  }
}

// 국기 이모지는 OS/브라우저에 따라 (특히 Windows에서) 국가 코드 글자로 보일 수 있어,
// flagcdn.com 국기 이미지를 대신 사용해 어디서나 국기 아이콘이 나오도록 한다
function flagImg(code, size) {
  const cls = size === 'big' ? 'wr-flag-img wr-flag-img-big' : 'wr-flag-img';
  const c = (code || '').toLowerCase();
  return `<img class="${cls}" src="https://flagcdn.com/24x18/${c}.png" srcset="https://flagcdn.com/48x36/${c}.png 2x" width="24" height="18" alt="${code}" loading="lazy" onerror="this.remove()">`;
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
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  myCountryWrap: document.getElementById('my-country-wrap'),
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
    el.countryBadge.innerHTML = `${flagImg(countryCode)} ${countryName(countryCode)}`;
    el.countryBadge.title = 'Auto-detected by IP';
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
  el.leaderboardList.innerHTML = '';

  if (entries.length === 0) {
    const li = document.createElement('li');
    li.className = 'wr-lb-empty';
    li.textContent = 'No scores yet';
    el.leaderboardList.appendChild(li);
  } else {
    entries.slice(0, 10).forEach(([code, score], idx) => {
      const li = document.createElement('li');
      li.className = 'wr-lb-row';
      if (code === countryCode) li.classList.add('wr-lb-mine');
      li.innerHTML = `
        <span class="wr-lb-rank">${idx + 1}</span>
        <span class="wr-lb-name">${flagImg(code)} ${countryName(code)}</span>
        <span class="wr-lb-score">${score.toLocaleString()}</span>
      `;
      el.leaderboardList.appendChild(li);
    });
  }

  renderMyCountryRow(entries);
}

function renderMyCountryRow(entries) {
  if (!el.myCountryWrap) return;
  if (!countryCode) {
    el.myCountryWrap.hidden = true;
    return;
  }
  const idx = entries.findIndex(([code]) => code === countryCode);
  const rank = idx >= 0 ? idx + 1 : '-';
  const score = idx >= 0 ? entries[idx][1] : 0;
  el.myCountryWrap.hidden = false;
  el.myCountryWrap.innerHTML = `
    <p class="wr-lb-mine-label">Your country</p>
    <div class="wr-lb-row wr-lb-mine">
      <span class="wr-lb-rank">${rank}</span>
      <span class="wr-lb-name">${flagImg(countryCode)} ${countryName(countryCode)}</span>
      <span class="wr-lb-score">${score.toLocaleString()}</span>
    </div>
  `;
}

function renderCountryGrid() {
  el.countryGrid.innerHTML = '';
  const codes = [...ALL_COUNTRY_CODES].sort((a, b) => countryName(a).localeCompare(countryName(b), 'en'));
  codes.forEach((code) => {
    const btn = document.createElement('button');
    btn.className = 'wr-country-btn';
    btn.innerHTML = `${flagImg(code, 'big')}<span>${countryName(code)}</span>`;
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
  const { data, error } = await supabaseClient.from('country_scores').select('*');
  if (error) {
    console.error('Failed to load leaderboard:', error);
    return;
  }
  leaderboard = {};
  data.forEach((row) => { leaderboard[row.country_code] = row.score; });
  renderLeaderboard();
}

async function bumpGlobalScore(code) {
  const { error } = await supabaseClient.rpc('increment_country_score', { p_country_code: code });
  if (error) console.error('Failed to update score:', error);
}

function subscribeRealtime() {
  supabaseClient
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
  renderTheme('light');
  renderCountryBadge();
  renderCountryGrid();
  el.input.placeholder = 'Loading...';

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
  el.input.placeholder = '';

  if (countryCode) {
    el.input.disabled = false;
    el.input.focus();
  } else {
    showFallbackPicker();
  }
}

init();