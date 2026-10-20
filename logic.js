'use strict';

// 행맨(글자 맞추기): 규칙만 모아 둔 파일 (그리기·입력 없음). 브라우저와 테스트(Node)가 같이 쓴다.
//
// - 숨은 단어의 글자를 '자모'(ㄱ, ㅏ 같은 낱글자) 하나씩 골라 맞힌다. 단어에 있으면 그 자리가 열리고, 없으면 기회가 하나 줄어든다
// - 한 글자는 초성·중성·종성으로 이루어져 있어서 자모가 열리는 만큼 글자가 조금씩 채워진다 (사 → ㅅ → 사)
// - 보통은 기회 7번(분야 힌트 있음), 어려움은 5번(분야 힌트 없음). 단어를 맞히면 점수를 받고 다음 단어로, 기회가 다 없어지면 끝
// - 힌트: 단어마다 한 번, 안 열린 자모 하나를 열어 주는 대신 기회가 하나 준다
const LOGIC_HANG = (() => {
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
// 자판에 놓이는 자모: 기본 자음·모음, 그리고 쌍자음·겹모음
const KEYS = {
  consonants: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'],
  vowels: ['ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ', 'ㅐ', 'ㅔ'],
  extra: ['ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ', 'ㅒ', 'ㅖ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅢ'],
};
const ALL_KEYS = [...KEYS.consonants, ...KEYS.vowels, ...KEYS.extra];

// 분야별 단어 (받침에 겹받침이 없는 단어만 쓴다)
const WORDS = {
  과일: ['사과', '바나나', '포도', '딸기', '수박', '참외', '복숭아', '오렌지', '레몬', '키위', '자두', '망고', '체리', '파인애플', '멜론', '석류', '앵두', '무화과', '블루베리', '토마토'],
  동물: ['강아지', '고양이', '토끼', '사자', '호랑이', '코끼리', '기린', '원숭이', '오리', '거북이', '다람쥐', '펭귄', '고래', '상어', '독수리', '하마', '악어', '판다', '여우', '돌고래'],
  음식: ['김치', '비빔밥', '떡볶이', '불고기', '라면', '김밥', '된장찌개', '삼겹살', '짜장면', '냉면', '만두', '피자', '햄버거', '치킨', '샌드위치', '아이스크림', '잡채', '순대', '감자탕', '초콜릿'],
  나라: ['한국', '일본', '중국', '미국', '영국', '프랑스', '독일', '이탈리아', '스페인', '호주', '캐나다', '브라질', '인도', '태국', '베트남', '서울', '부산', '제주도', '이집트', '러시아'],
  직업: ['의사', '선생님', '소방관', '경찰관', '요리사', '가수', '화가', '농부', '판사', '군인', '기자', '간호사', '변호사', '과학자', '운동선수', '우주비행사', '미용사', '배우', '작가', '조종사'],
  운동: ['축구', '야구', '농구', '배구', '수영', '탁구', '테니스', '골프', '달리기', '줄넘기', '스키', '볼링', '태권도', '씨름', '마라톤', '배드민턴', '스케이트', '양궁', '유도', '줄다리기'],
  물건: ['연필', '지우개', '가방', '안경', '시계', '우산', '의자', '책상', '냉장고', '세탁기', '텔레비전', '컴퓨터', '휴대폰', '이불', '칫솔', '거울', '달력', '자전거', '신발', '장난감'],
  자연: ['하늘', '바다', '구름', '무지개', '호수', '폭포', '사막', '화산', '번개', '눈사람', '태양', '별똥별', '나무', '단풍', '해바라기', '장미', '코스모스', '은하수', '봄바람', '보름달'],
};
const POOL = Object.entries(WORDS).flatMap(([cat, ws]) => ws.map((w) => ({ cat, word: w })));
const MODES = { normal: { lives: 7, showCat: true, name: '보통' }, hard: { lives: 5, showCat: false, name: '어려움' } };

// 글자 → 초성·중성·종성 (종성이 없으면 '')
const syllableOf = (ch) => {
  const c = ch.charCodeAt(0) - 0xAC00;
  if (c < 0 || c > 11171) return null;
  return { cho: CHO[Math.floor(c / 588)], jung: JUNG[Math.floor((c % 588) / 28)], jong: JONG[c % 28] };
};
const compose = (cho, jung, jong = '') => String.fromCharCode(0xAC00 + CHO.indexOf(cho) * 588 + JUNG.indexOf(jung) * 28 + JONG.indexOf(jong));
const decompose = (word) => [...word].map(syllableOf);

function rng(seed) {                                     // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function newRun(mode = 'normal', seed = (Math.random() * 2 ** 31) | 0) {
  const m = MODES[mode] || MODES.normal;
  const st = {
    mode, seed, rand: rng(seed), maxLives: m.lives, showCat: m.showCat, score: 0, streak: 0, solved: 0, bestStreak: 0, over: false,
    order: [], cursor: 0, word: null, cat: '', syls: [], guessed: [], wrong: [], lives: m.lives, hinted: false, state: 'play', lastGain: 0,
  };
  const idx = POOL.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(st.rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  st.order = idx;
  nextWord(st);
  return st;
}
function nextWord(st) {
  if (st.cursor >= st.order.length) { st.cursor = 0; }                       // 다 쓰면 처음부터 (다시 섞지는 않는다)
  const w = POOL[st.order[st.cursor++]];
  st.word = w.word; st.cat = w.cat; st.syls = decompose(w.word);
  st.guessed = []; st.wrong = []; st.lives = st.maxLives; st.hinted = false; st.state = 'play';
  return w;
}

// 단어에 쓰인 모든 자모(중복 없이)
const lettersOf = (st) => [...new Set(st.syls.flatMap((s) => [s.cho, s.jung, s.jong].filter(Boolean)))];
const isOpen = (st, ch) => st.guessed.includes(ch);
const isSolved = (st) => lettersOf(st).every((ch) => isOpen(st, ch));

// 자모 하나를 고른다. 돌려주는 값: { hit: 열린 자리 수, state } (이미 골랐거나 끝난 판이면 null)
function guess(st, ch) {
  if (st.state !== 'play' || st.guessed.includes(ch) || !ALL_KEYS.includes(ch)) return null;
  st.guessed.push(ch);
  const hit = st.syls.reduce((n, s) => n + [s.cho, s.jung, s.jong].filter((x) => x === ch).length, 0);
  if (hit === 0) { st.wrong.push(ch); st.lives--; }
  settle(st);
  return { hit, state: st.state };
}
function settle(st) {
  if (st.state !== 'play') return;
  if (isSolved(st)) {
    st.state = 'won'; st.solved++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak);
    st.lastGain = 50 + st.lives * 15 + [...st.word].length * 10 + Math.min(st.streak - 1, 10) * 10;
    st.score += st.lastGain;
  } else if (st.lives <= 0) { st.state = 'lost'; st.over = true; st.streak = 0; st.lastGain = 0; }
}

// 힌트: 안 열린 자모 하나를 열어 준다 (단어마다 한 번, 기회가 하나 줄고, 마지막 기회일 땐 못 쓴다)
const canHint = (st) => st.state === 'play' && !st.hinted && st.lives > 1 && lettersOf(st).some((ch) => !isOpen(st, ch));
function hint(st) {
  if (!canHint(st)) return null;
  const hidden = lettersOf(st).filter((ch) => !isOpen(st, ch));
  const ch = hidden[Math.floor(st.rand() * hidden.length)];
  st.hinted = true; st.lives--;
  st.guessed.push(ch);
  settle(st);
  return { ch, state: st.state };
}

// 화면에 보일 글자들. 초성·중성이 열렸으면 한 글자로 합쳐 보이고, 하나만 열렸으면 그 자모만, 둘 다 안 열렸으면 빈칸.
// done: 글자가 모두 열림 · partial: 받침이 아직 안 열림
function display(st, reveal = false) {
  return st.syls.map((s, i) => {
    const full = [...st.word][i];
    const c = reveal || isOpen(st, s.cho), j = reveal || isOpen(st, s.jung), f = !s.jong || reveal || isOpen(st, s.jong);
    if (c && j) return { text: f ? full : compose(s.cho, s.jung), done: f, partial: !f };
    if (c) return { text: s.cho, done: false, partial: true };
    if (j) return { text: s.jung, done: false, partial: true };
    return { text: '', done: false, partial: false };
  });
}

// 2벌식 자판 입력 → 자모 (PC 키보드용)
const KEYMAP = { KeyQ: ['ㅂ', 'ㅃ'], KeyW: ['ㅈ', 'ㅉ'], KeyE: ['ㄷ', 'ㄸ'], KeyR: ['ㄱ', 'ㄲ'], KeyT: ['ㅅ', 'ㅆ'], KeyY: ['ㅛ'], KeyU: ['ㅕ'], KeyI: ['ㅑ'], KeyO: ['ㅐ', 'ㅒ'], KeyP: ['ㅔ', 'ㅖ'],
  KeyA: ['ㅁ'], KeyS: ['ㄴ'], KeyD: ['ㅇ'], KeyF: ['ㄹ'], KeyG: ['ㅎ'], KeyH: ['ㅗ'], KeyJ: ['ㅓ'], KeyK: ['ㅏ'], KeyL: ['ㅣ'],
  KeyZ: ['ㅋ'], KeyX: ['ㅌ'], KeyC: ['ㅊ'], KeyV: ['ㅍ'], KeyB: ['ㅠ'], KeyN: ['ㅜ'], KeyM: ['ㅡ'] };
const keyToJamo = (code, shift) => { const k = KEYMAP[code]; return k ? (shift && k[1] ? k[1] : k[0]) : null; };

const gradeOf = (score) => (score >= 3000 ? 3 : score >= 1500 ? 2 : score >= 600 ? 1 : 0);   // 0 없음 · 1 동 · 2 은 · 3 금

return { CHO, JUNG, JONG, KEYS, ALL_KEYS, WORDS, POOL, MODES, syllableOf, compose, decompose, newRun, nextWord, lettersOf, isOpen, isSolved, guess, canHint, hint, display, keyToJamo, gradeOf };
})();
if (typeof module !== 'undefined') module.exports = LOGIC_HANG;
