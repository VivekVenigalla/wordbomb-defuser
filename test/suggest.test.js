// Tests for src/suggest.js. Run them with:  npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getSuggestions, SUGGESTION_COUNT } = require('../src/suggest.js');
const { createGameState, setMyId, applyEvent } = require('../src/game-state.js');
const { loadTiers } = require('../src/tiers.js');

const WORDS = ['thin', 'thing', 'think', 'thinking', 'nothing', 'this', 'cat', 'catalog'];

// Builds a game state: the prompt is `prompt`, and it is `who`'s turn. We are always "me".
function stateWith(prompt, who) {
  const state = createGameState();
  setMyId(state, 'me');
  applyEvent(state, { name: 'turn', data: { letter: prompt, count: 1, turn: who } });
  return state;
}

test('on our turn it returns words that contain the prompt', () => {
  const words = getSuggestions(WORDS, stateWith('THI', 'me'), 2);
  assert.ok(words.length > 0);
  assert.ok(words.every((word) => word.includes('thi')));
});

test('it returns nothing when it is someone else\'s turn', () => {
  assert.deepEqual(getSuggestions(WORDS, stateWith('THI', 'someone-else'), 2), []);
});

test('it returns nothing when no game is running (empty prompt)', () => {
  assert.deepEqual(getSuggestions(WORDS, createGameState(), 2), []);
});

test('when we do not know whose turn it is, it still returns words', () => {
  const state = createGameState(); // no id set, so isMyTurn is null
  applyEvent(state, { name: 'turn', data: { letter: 'thi', count: 1, turn: 'x' } });
  assert.ok(getSuggestions(WORDS, state, 2).length > 0);
});

test('it never returns more than SUGGESTION_COUNT words', () => {
  const many = Array.from({ length: 50 }, (_, i) => 'thi' + 'x'.repeat(i));
  assert.equal(getSuggestions(many, stateWith('thi', 'me'), 2).length, SUGGESTION_COUNT);
});

test('minLength leaves out words that are too short', () => {
  const words = getSuggestions(WORDS, stateWith('thi', 'me'), 7);
  assert.deepEqual(words.sort(), ['nothing', 'thinking']);
});

test('a very large minLength still works', () => {
  const longWords = ['thi' + 'x'.repeat(20), 'thi' + 'x'.repeat(17)]; // 23 and 20 letters
  const words = getSuggestions(longWords, stateWith('thi', 'me'), 20);
  assert.equal(words.length, 2);
  assert.equal(words[0].length, 20); // the shorter one wins, as usual
});

test('no matching words gives an empty list', () => {
  assert.deepEqual(getSuggestions(WORDS, stateWith('zzq', 'me'), 2), []);
});

test('with tiers, everyday words are suggested before rare ones', () => {
  const words = ['thig', 'thin', 'this', 'thio'];
  const tiers = loadTiers('this 0\nthin 1\nthig 7\nthio 7');
  const result = getSuggestions(words, stateWith('thi', 'me'), 2, tiers);
  assert.deepEqual(result.slice(0, 2), ['this', 'thin']);
});

test('without tiers it still works (commonness is simply ignored)', () => {
  const result = getSuggestions(['thig', 'this'], stateWith('thi', 'me'), 2);
  assert.deepEqual(result, ['thig', 'this']); // alphabetical, as before
});

// A game state where it is our turn, the prompt is `prompt`, and the letters in `needed` are still needed.
function stateNeeding(prompt, needed) {
  const state = stateWith(prompt, 'me');
  const healths = {};
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') healths[letter] = needed.includes(letter.toLowerCase()) ? 1 : 0;
  applyEvent(state, { name: 'user-letter-healths', data: healths });
  return state;
}

test('words using the letters we still need are suggested first', () => {
  const words = ['thin', 'this', 'thing', 'thick', 'thigh'];
  // Without needs, short words win. Needing "k" puts "thick" first; needing "g" puts a g-word first.
  assert.equal(getSuggestions(words, stateNeeding('thi', 'k'), 2)[0], 'thick');
  assert.ok(['thing', 'thigh'].includes(getSuggestions(words, stateNeeding('thi', 'g'), 2)[0]));
});

test('a word with two needed letters beats a word with one', () => {
  const words = ['thing', 'thinking', 'thick']; // "thinking" has both k and g
  assert.equal(getSuggestions(words, stateNeeding('thi', 'kg'), 2)[0], 'thinking');
});

test('when no letters are needed, the suggestions are the same as without the feature', () => {
  const words = ['thin', 'thing', 'thick'];
  assert.deepEqual(getSuggestions(words, stateNeeding('thi', ''), 2), getSuggestions(words, stateWith('thi', 'me'), 2));
});

test('needed letters still respect the minimum length', () => {
  const words = ['thick', 'thickest']; // "thick" has the needed k but is too short for minLength 8
  assert.deepEqual(getSuggestions(words, stateNeeding('thi', 'k'), 8), ['thickest']);
});

test('needed letters do not make an uncommon word beat a much more common one without good reason', () => {
  // "thiqz" is tier 8 (-24) and has one needed letter (+10); "this" is tier 0: the common word wins
  const tiers = loadTiers('this 0');
  assert.equal(getSuggestions(['thiqz', 'this'], stateNeeding('thi', 'q'), 2, tiers)[0], 'this');
});
