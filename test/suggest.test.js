// Tests for src/suggest.js. Run them with:  npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getSuggestions, SUGGESTION_COUNT } = require('../src/suggest.js');
const { createGameState, setMyId, applyEvent } = require('../src/game-state.js');

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
