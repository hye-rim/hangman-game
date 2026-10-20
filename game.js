'use strict';

// 행맨: 화면·입력·소리. 규칙과 단어는 logic.js (LOGIC_HANG)
(() => {
const L = LOGIC_HANG;
const $ = (id) => document.getElementById(id);
const INK = '#2b1d52';

// ---------- 저장소 ----------
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
};
const best = { normal: Number(store.get('hangmanBestNormal')) || 0, hard: Number(store.get('hangmanBestHard')) || 0 };
const bestAll = () => Math.max(best.normal, best.hard);

// ---------- 소리 ----------
let audio = null;
let muted = store.get('hangmanMuted') === '1';
function tone(freq, dur, type = 'sine', vol = 0.09, slide = 0) {
  if (muted) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime;
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + dur);
  } catch (_) {}
}
const seq = (notes, step, type = 'triangle', vol = 0.09) => notes.forEach((f, i) => setTimeout(() => tone(f, step * 0.0009, type, vol), i * step));
const sfx = {
  hit: (n) => tone(520 + n * 90, 0.09, 'triangle', 0.09, 160),
  miss: () => tone(200, 0.18, 'square', 0.05, -80),
  win: () => seq([523, 659, 784, 1047], 90, 'triangle', 0.1),
  lose: () => seq([392, 330, 262, 196], 150, 'sawtooth', 0.06),
  hint: () => tone(880, 0.12, 'sine', 0.07, 260),
  medal: () => seq([523, 659, 784, 1047], 90, 'triangle', 0.1),
};
function toggleMute() { muted = !muted; store.set('hangmanMuted', muted ? '1' : '0'); $('muteBtn').textContent = muted ? '🔇' : '🔊'; }
$('muteBtn').onclick = (e) => { e.currentTarget.blur(); toggleMute(); };
$('muteBtn').textContent = muted ? '🔇' : '🔊';

// ---------- 상태 ----------
let st = L.newRun('normal', 20241021);
let playing = false, mode = 'normal';
let keyEls = {};

// ---------- 자판 만들기 ----------
function buildKeys() {
  const mk = (box, list) => {
    box.innerHTML = '';
    for (const ch of list) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'k'; b.textContent = ch; b.dataset.ch = ch;
      b.onclick = () => pick(ch);
      box.appendChild(b); keyEls[ch] = b;
    }
  };
  mk($('kC'), L.KEYS.consonants); mk($('kV'), L.KEYS.vowels); mk($('kX'), L.KEYS.extra);
}

// ---------- 그리기 ----------
function updateHud() {
  $('score').textContent = st.score.toLocaleString('ko-KR');
  $('streak').textContent = st.streak;
  $('best').textContent = bestAll().toLocaleString('ko-KR');
}
function renderLives() {
  $('lives').innerHTML = Array.from({ length: st.maxLives }, (_, i) => `<span class="heart ${i >= st.lives ? 'lost' : ''}">❤️</span>`).join('');
}
function renderMan() {
  const wrong = st.maxLives - st.lives;
  const shown = Math.min(6, Math.ceil(wrong * 7 / st.maxLives));           // 기회를 다 쓰는 마지막 틀림에서 얼굴이 X 가 된다
  document.querySelectorAll('#man .part').forEach((p) => p.classList.toggle('on', Number(p.dataset.n) <= shown));
  const dead = st.state === 'lost';
  $('eyesOk').style.display = dead ? 'none' : ''; $('mouthOk').style.display = dead ? 'none' : '';
  $('eyesDead').style.display = dead ? '' : 'none'; $('mouthDead').style.display = dead ? '' : 'none';
  if (dead) document.querySelectorAll('#man .part').forEach((p) => p.classList.add('on'));
}
function renderWord() {
  const lost = st.state === 'lost';
  const cells = L.display(st, lost);
  const open = L.display(st, false);
  $('word').className = lost ? 'lost' : '';
  $('word').innerHTML = cells.map((g, i) => {
    const cls = lost && !open[i].done ? 'cell miss' : g.done ? 'cell done' : g.partial ? 'cell partial' : 'cell';
    return `<div class="${cls}">${g.text}</div>`;
  }).join('');
}
function renderKeys() {
  const live = st.state === 'play' && playing;
  for (const ch of L.ALL_KEYS) {
    const b = keyEls[ch]; if (!b) continue;
    const used = st.guessed.includes(ch);
    b.classList.toggle('hit', used && !st.wrong.includes(ch));
    b.classList.toggle('miss', st.wrong.includes(ch));
    b.disabled = !live || used;
  }
}
function renderActions() {
  const box = $('actions');
  if (st.state === 'won') box.innerHTML = '<button class="next" id="nextBtn">다음 단어 ▶</button>';
  else box.innerHTML = `<button id="hintBtn"${L.canHint(st) && playing ? '' : ' disabled'}>💡 힌트<small>기회 -1</small></button>`;
  const n = $('nextBtn'); if (n) n.onclick = nextWord;
  const h = $('hintBtn'); if (h) h.onclick = useHint;
}
function render() {
  $('cat').textContent = st.showCat ? `분야 · ${st.cat}` : '';
  renderLives(); renderMan(); renderWord(); renderKeys(); renderActions(); updateHud();
}
function say(t) { $('msg').textContent = t; }

// ---------- 행동 ----------
function pick(ch) {
  if (!playing || st.state !== 'play') return;
  const r = L.guess(st, ch);
  if (!r) return;
  if (r.hit) { sfx.hit(r.hit); say(r.hit > 1 ? `${ch} ${r.hit}군데 열렸어요!` : `${ch} 맞았어요!`); } else { sfx.miss(); say(`${ch} — 이 글자는 없어요`); }
  afterGuess();
}
function useHint() {
  if (!playing) return;
  const r = L.hint(st);
  if (!r) return;
  sfx.hint(); say(`💡 힌트로 ${r.ch} 이(가) 열렸어요`);
  afterGuess();
}
function afterGuess() {
  render();
  if (st.state === 'won') { sfx.win(); say(`🎉 정답! +${st.lastGain}점`); saveBest(); updateHud(); }
  else if (st.state === 'lost') { sfx.lose(); playing = false; saveBest(); setTimeout(showOver, 1100); }
}
function nextWord() {
  if (st.state !== 'won') return;
  L.nextWord(st); say(''); render();
}
function saveBest() {
  if (st.score > best[mode]) { best[mode] = st.score; store.set(mode === 'hard' ? 'hangmanBestHard' : 'hangmanBestNormal', String(st.score)); }
  store.set('hangmanBest', String(bestAll()));
}

// ---------- 시작·끝 ----------
function startRun(m) {
  mode = m; st = L.newRun(m); playing = true;
  $('overlay').classList.add('hidden'); say('');
  render();
}
const MEDALS = [null, ['동메달', '#d98a4a'], ['은메달', '#c5ccd6'], ['금메달', '#ffd23f']];
function showOver() {
  const med = L.gradeOf(st.score), m = MEDALS[med];
  const rec = st.score > 0 && st.score >= best[mode];
  $('overlay').innerHTML = `
    <h2>아쉬워요! 😵</h2>
    <p>정답은 <b style="font-size:24px">${st.word}</b></p>
    <div class="big">${st.score.toLocaleString('ko-KR')}</div>
    ${rec ? '<span class="tag">최고 기록!</span>' : ''}
    ${m ? `<p><span class="tag" style="background:${m[1]};color:${INK}">🏅 ${m[0]}</span></p>` : '<p>600점을 넘으면 메달을 받아요</p>'}
    <dl class="stats card2"><dt>맞힌 단어</dt><dd>${st.solved}개</dd><dt>최고 연속</dt><dd>${st.bestStreak}</dd><dt>모드</dt><dd>${L.MODES[mode].name}</dd></dl>
    <div class="col"><button id="againBtn">다시 하기</button><button id="homeBtn" class="sub">모드 바꾸기</button></div>`;
  $('overlay').classList.remove('hidden');
  $('againBtn').onclick = (e) => { e.currentTarget.blur(); startRun(mode); };
  $('homeBtn').onclick = (e) => { e.currentTarget.blur(); showTitle(); };
  if (med) setTimeout(sfx.medal, 250);
}
function showTitle() {
  playing = false;
  st = L.newRun('normal', 20241021); render();
  $('overlay').innerHTML = `
    <h1>행맨</h1>
    <p>숨은 단어의 <b>자모</b>(ㄱ, ㅏ …)를 하나씩 골라 맞혀요<br>틀리면 행맨이 한 조각씩 완성돼요</p>
    <p style="font-size:12.5px">한 글자는 초성·중성·종성으로 이뤄져서<br>자모가 열리는 만큼 글자가 채워져요 (ㅅ → 사)<br>🔤 쌍자음·겹모음은 아래 줄 자판에 있어요</p>
    <div class="col"><button id="normalBtn">보통<small>기회 7번 · 분야 힌트 ${best.normal ? '· 최고 ' + best.normal.toLocaleString('ko-KR') : ''}</small></button><button id="hardBtn" class="sub">어려움 · 기회 5번 · 분야 힌트 없음${best.hard ? ' · 최고 ' + best.hard.toLocaleString('ko-KR') : ''}</button></div>
    <p style="font-size:12px;opacity:.85">PC: 한글 자판 그대로 입력 · Enter 다음 단어 · 숫자 1 힌트</p>`;
  $('overlay').classList.remove('hidden');
  $('normalBtn').onclick = (e) => { e.currentTarget.blur(); startRun('normal'); };
  $('hardBtn').onclick = (e) => { e.currentTarget.blur(); startRun('hard'); };
}

// ---------- 키보드 (PC) ----------
addEventListener('keydown', (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'Enter' || e.code === 'Space') { if (st.state === 'won') { e.preventDefault(); nextWord(); } return; }
  if (e.code === 'Digit1') { useHint(); return; }
  const ch = L.keyToJamo(e.code, e.shiftKey);
  if (ch) { e.preventDefault(); pick(ch); }
});

buildKeys();
showTitle();

/* @test-hooks:start */
window.__hm = { get st() { return st; }, pick, useHint, nextWord, startRun, get playing() { return playing; } };
/* @test-hooks:end */
})();
