const COUNTRIES = [
  { code: 'KR', name: '대한민국', flag: '🇰🇷' },
  { code: 'US', name: '미국', flag: '🇺🇸' },
  { code: 'JP', name: '일본', flag: '🇯🇵' },
  { code: 'CN', name: '중국', flag: '🇨🇳' },
  { code: 'GB', name: '영국', flag: '🇬🇧' },
  { code: 'DE', name: '독일', flag: '🇩🇪' },
  { code: 'FR', name: '프랑스', flag: '🇫🇷' },
  { code: 'CA', name: '캐나다', flag: '🇨🇦' },
  { code: 'AU', name: '호주', flag: '🇦🇺' },
  { code: 'BR', name: '브라질', flag: '🇧🇷' },
  { code: 'IN', name: '인도', flag: '🇮🇳' },
  { code: 'RU', name: '러시아', flag: '🇷🇺' },
  { code: 'ES', name: '스페인', flag: '🇪🇸' },
  { code: 'IT', name: '이탈리아', flag: '🇮🇹' },
  { code: 'MX', name: '멕시코', flag: '🇲🇽' },
  { code: 'ID', name: '인도네시아', flag: '🇮🇩' },
  { code: 'VN', name: '베트남', flag: '🇻🇳' },
  { code: 'TH', name: '태국', flag: '🇹🇭' },
  { code: 'PH', name: '필리핀', flag: '🇵🇭' },
  { code: 'TR', name: '튀르키예', flag: '🇹🇷' },
  { code: 'NL', name: '네덜란드', flag: '🇳🇱' },
  { code: 'SE', name: '스웨덴', flag: '🇸🇪' },
  { code: 'PL', name: '폴란드', flag: '🇵🇱' },
  { code: 'AR', name: '아르헨티나', flag: '🇦🇷' },
  { code: 'EG', name: '이집트', flag: '🇪🇬' },
  { code: 'SA', name: '사우디아라비아', flag: '🇸🇦' },
  { code: 'ZA', name: '남아프리카공화국', flag: '🇿🇦' },
  { code: 'NG', name: '나이지리아', flag: '🇳🇬' },
  { code: 'PK', name: '파키스탄', flag: '🇵🇰' },
  { code: 'BD', name: '방글라데시', flag: '🇧🇩' },
  { code: 'IL', name: '이스라엘', flag: '🇮🇱' },
  { code: 'SG', name: '싱가포르', flag: '🇸🇬' },
  { code: 'MY', name: '말레이시아', flag: '🇲🇾' },
  { code: 'NZ', name: '뉴질랜드', flag: '🇳🇿' },
  { code: 'UA', name: '우크라이나', flag: '🇺🇦' },
];

const WORDS = [
  'apple','orange','banana','purple','yellow','silver','bridge','castle','forest','desert',
  'winter','summer','autumn','spring','planet','rocket','engine','harbor','island','valley',
  'canyon','tunnel','signal','camera','pencil','pillow','blanket','window','mirror','ladder',
  'basket','bottle','candle','feather','marble','ribbon','shadow','shelter','thunder','whisper',
  'anchor','ballet','breeze','bubble','ceiling','circuit','compass','crystal','diamond','dragon',
  'echo','engine','falcon','galaxy','garden','glacier','horizon','journey','jungle','kingdom',
  'lantern','legend','lighthouse','magnet','meadow','mission','monster','morning','mountain','mystery',
  'network','ocean','orbit','oxygen','palace','panther','parade','pattern','phoenix','pirate',
  'pocket','poetry','portal','power','puzzle','python','quartz','quiver','rabbit','random',
  'rescue','ripple','river','rustle','saddle','safari','sailor','sample','sapphire','satellite',
  'scatter','scholar','season','secret','shelter','shield','shimmer','shuttle','silence','sketch',
  'skyline','slogan','smoke','snake','sneaker','solar','spider','spiral','sprout','square',
  'stable','statue','stream','stripe','sunset','sunrise','swift','symbol','system','temple',
  'tiger','timber','tissue','torch','tower','tractor','trailer','trumpet','turtle','twilight',
  'umbrella','uniform','valley','vapor','velvet','venture','vessel','victory','village','violin',
  'vortex','voyage','wander','warrior','weather','whistle','willow','wizard','wonder','zebra','zephyr'
];

const LOCAL_KEY = 'wr-player-profile';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let countryCode = null;
let personalScore = 0;
let streak = 0;
let bestStreak = 0;
let currentWord = pickWord();
let typed = '';
let leaderboard = {};

const el = {
  app: document.getElementById('app'),
  themeToggle: document.getElementById('theme-toggle'),
  countryPill: document.getElementById('country-pill'),
  statScore: document.getElementById('stat-score'),
  statStreak: document.getElementById('stat-streak'),
  statBest: document.getElementById('stat-best'),
  wordDisplay: document.getElementById('word-display'),
  input: document.getElementById('word-input'),
  leaderboardList: document.getElementById('leaderboard-list'),
  pickerOverlay: document.getElementById('picker-overlay'),
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

function renderCountryPill() {
  const c = COUNTRIES.find((x) => x.code === countryCode);
  if (c) {
    el.countryPill.hidden = false;
    el.countryPill.textContent = `${c.flag} ${c.name} · 변경`;
  } else {
    el.countryPill.hidden = true;
  }
}

function renderStats() {
  el.statScore.textContent = personalScore.toLocaleString();
  el.statStreak.textContent = `🔥 ${streak}`;
  el.statBest.textContent = bestStreak.toLocaleString();
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
    const c = COUNTRIES.find((x) => x.code === code);
    const pct = maxScore ? (score / maxScore) * 100 : 0;
    const li = document.createElement('li');
    if (code === countryCode) li.classList.add('wr-lb-mine');
    li.innerHTML = `
      <span class="wr-lb-rank">${medal(idx)}</span>
      <span>${c ? c.flag : '🏳️'}</span>
      <span class="wr-lb-name">${c ? c.name : code}</span>
      <div class="wr-lb-bar-track"><div class="wr-lb-bar" style="width:${pct}%"></div></div>
      <span class="wr-lb-score">${score.toLocaleString()}</span>
    `;
    el.leaderboardList.appendChild(li);
  });
}

function renderCountryGrid() {
  el.countryGrid.innerHTML = '';
  COUNTRIES.forEach((c) => {
    const btn = document.createElement('button');
    btn.className = 'wr-country-btn';
    btn.innerHTML = `<span class="wr-flag-big">${c.flag}</span><span>${c.name}</span>`;
    btn.addEventListener('click', () => chooseCountry(c.code));
    el.countryGrid.appendChild(btn);
  });
}

function showPicker() {
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
  renderCountryPill();
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

function init() {
  loadProfile();
  renderTheme('dark');
  renderCountryPill();
  renderStats();
  renderWord();
  renderCountryGrid();

  el.input.addEventListener('input', handleInput);
  el.themeToggle.addEventListener('click', () => {
    renderTheme(el.app.dataset.theme === 'dark' ? 'light' : 'dark');
  });
  el.countryPill.addEventListener('click', showPicker);

  if (!countryCode) {
    showPicker();
  } else {
    el.input.disabled = false;
    el.input.focus();
  }

  fetchLeaderboard();
  subscribeRealtime();
}

init();
