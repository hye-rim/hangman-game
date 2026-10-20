'use strict';
const test = require('node:test');
const assert = require('node:assert');
const L = require('../logic.js');

test('decompose and compose round trip for every word', () => {
  for (const { word } of L.POOL) {
    const syls = L.decompose(word);
    syls.forEach((s, i) => { assert.ok(s, word); assert.strictEqual(L.compose(s.cho, s.jung, s.jong), [...word][i]); });
  }
  assert.deepStrictEqual(L.syllableOf('값'), { cho: 'ㄱ', jung: 'ㅏ', jong: 'ㅄ' });
  assert.deepStrictEqual(L.syllableOf('사'), { cho: 'ㅅ', jung: 'ㅏ', jong: '' });
});

test('word list: unique, two or more syllables, only keyboard jamo, no compound final', () => {
  const seen = new Set();
  for (const { word, cat } of L.POOL) {
    assert.ok(!seen.has(word), 'duplicate ' + word); seen.add(word);
    assert.ok([...word].length >= 2, 'too short ' + word);
    for (const s of L.decompose(word)) {
      for (const ch of [s.cho, s.jung, s.jong].filter(Boolean)) assert.ok(L.ALL_KEYS.includes(ch), `${word}: ${ch} not on keyboard`);
      assert.ok(!['ㄳ', 'ㄵ', 'ㄶ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅄ'].includes(s.jong), 'compound final in ' + word);
    }
  }
  assert.ok(L.POOL.length >= 150);
  assert.strictEqual(new Set(L.POOL.map((w) => w.cat)).size, 8);
});

test('guess: hits open every slot (initial and final), misses cost a life', () => {
  const st = L.newRun('normal', 1);
  st.word = '강아지'; st.syls = L.decompose('강아지'); st.guessed = []; st.wrong = []; st.lives = 7; st.state = 'play';
  const r = L.guess(st, 'ㅇ');                           // 강의 종성 ㅇ + 아의 초성 ㅇ
  assert.strictEqual(r.hit, 2);
  assert.strictEqual(st.lives, 7);
  const m = L.guess(st, 'ㅂ');
  assert.strictEqual(m.hit, 0); assert.strictEqual(st.lives, 6); assert.deepStrictEqual(st.wrong, ['ㅂ']);
  assert.strictEqual(L.guess(st, 'ㅇ'), null);           // same twice: ignored
  assert.strictEqual(L.guess(st, 'x'), null);            // not a jamo key
  assert.strictEqual(st.lives, 6);
});

test('display: a syllable fills in step by step', () => {
  const st = L.newRun('normal', 2);
  st.word = '사과'; st.syls = L.decompose('사과'); st.guessed = [];
  assert.deepStrictEqual(L.display(st).map((g) => g.text), ['', '']);
  L.guess(st, 'ㅅ'); assert.deepStrictEqual(L.display(st).map((g) => g.text), ['ㅅ', '']);
  L.guess(st, 'ㅏ'); assert.deepStrictEqual(L.display(st).map((g) => g.text), ['사', '']);       // ㅏ is in both syllables, 과 still needs ㄱ and ㅗ
  const d = L.display(st); assert.ok(d[0].done && !d[1].done);
  L.guess(st, 'ㄱ'); assert.strictEqual(L.display(st)[1].text, 'ㄱ');
  const lives = st.lives; L.guess(st, 'ㅗ');                                     // 과 = ㄱ + ㅘ (겹모음은 그 자체가 한 글자), so ㅗ is a miss
  assert.strictEqual(st.lives, lives - 1); assert.strictEqual(L.isSolved(st), false);
  L.guess(st, 'ㅘ'); assert.strictEqual(L.isSolved(st), true);
});

test('display keeps a missing final visible as partial', () => {
  const st = L.newRun('normal', 3);
  st.word = '강'; st.syls = L.decompose('강'); st.guessed = ['ㄱ', 'ㅏ'];
  const [g] = L.display(st);
  assert.strictEqual(g.text, '가'); assert.ok(g.partial && !g.done);
  st.guessed.push('ㅇ'); assert.strictEqual(L.display(st)[0].text, '강');
  assert.strictEqual(L.display(st, true)[0].text, '강');
});

test('solving scores by lives left, word length and streak; losing ends the run', () => {
  const st = L.newRun('normal', 4);
  st.word = '사과'; st.syls = L.decompose('사과'); st.guessed = []; st.lives = 7; st.state = 'play';
  for (const ch of ['ㅅ', 'ㅏ', 'ㄱ', 'ㅘ']) L.guess(st, ch);
  assert.strictEqual(st.state, 'won');
  assert.strictEqual(st.lastGain, 50 + 7 * 15 + 2 * 10);
  assert.strictEqual(st.streak, 1);
  L.nextWord(st);
  assert.strictEqual(st.state, 'play'); assert.strictEqual(st.lives, st.maxLives); assert.strictEqual(st.guessed.length, 0);
  const lose = L.newRun('hard', 5);
  assert.strictEqual(lose.maxLives, 5); assert.strictEqual(lose.showCat, false);
  const wrongKeys = L.ALL_KEYS.filter((k) => !L.lettersOf(lose).includes(k));
  for (let i = 0; i < 5; i++) L.guess(lose, wrongKeys[i]);
  assert.strictEqual(lose.state, 'lost'); assert.ok(lose.over); assert.strictEqual(lose.streak, 0);
  assert.strictEqual(L.guess(lose, wrongKeys[6]), null);
});

test('hint opens one hidden jamo once per word and costs a life', () => {
  const st = L.newRun('normal', 6);
  const before = st.lives, open = st.guessed.length;
  assert.ok(L.canHint(st));
  const h = L.hint(st);
  assert.ok(h && L.lettersOf(st).includes(h.ch));
  assert.strictEqual(st.lives, before - 1); assert.strictEqual(st.guessed.length, open + 1);
  assert.strictEqual(L.hint(st), null);                  // only once
  const low = L.newRun('normal', 7); low.lives = 1; assert.ok(!L.canHint(low));
});

test('keyboard mapping (2-set layout)', () => {
  assert.strictEqual(L.keyToJamo('KeyK', false), 'ㅏ'); assert.strictEqual(L.keyToJamo('KeyR', false), 'ㄱ'); assert.strictEqual(L.keyToJamo('KeyR', true), 'ㄲ');
  assert.strictEqual(L.keyToJamo('KeyY', true), 'ㅛ'); assert.strictEqual(L.keyToJamo('Digit1', false), null);
});

test('every word can be solved by guessing its own letters (random runs stay consistent)', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const st = L.newRun(seed % 2 ? 'normal' : 'hard', seed);
    for (let n = 0; n < 12; n++) {
      for (const ch of L.lettersOf(st)) L.guess(st, ch);
      assert.strictEqual(st.state, 'won'); assert.ok(st.score > 0);
      L.nextWord(st);
    }
  }
});
