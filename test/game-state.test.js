// Tests for src/game-state.js. Run them with:  npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGameState,
  getSessionId,
  setMyId,
  applyEvent,
  isMyTurn,
} = require('../src/game-state.js');

function turnEvent(letter, count, who) {
  return { name: 'turn', data: { letter: letter, count: count, turn: who } };
}

test('a fresh state knows nothing', () => {
  assert.deepEqual(createGameState(), { myId: null, prompt: '', count: 0, turnId: null });
});

test('each call to createGameState gives a separate object', () => {
  const a = createGameState();
  const b = createGameState();
  a.prompt = 'thi';
  assert.equal(b.prompt, '');
});

test('a turn event sets the prompt (lowercase), the count and whose turn it is', () => {
  const state = createGameState();
  const changed = applyEvent(state, turnEvent('THI', 2525, 'player-1'));
  assert.equal(changed, true);
  assert.equal(state.prompt, 'thi');
  assert.equal(state.count, 2525);
  assert.equal(state.turnId, 'player-1');
});

test('a newer turn event replaces the old one', () => {
  const state = createGameState();
  applyEvent(state, turnEvent('THI', 2525, 'player-1'));
  applyEvent(state, turnEvent('QU', 900, 'player-2'));
  assert.equal(state.prompt, 'qu');
  assert.equal(state.turnId, 'player-2');
});

test('other events change nothing and report that', () => {
  const state = createGameState();
  applyEvent(state, turnEvent('THI', 2525, 'player-1'));
  const before = { ...state };
  assert.equal(applyEvent(state, { name: 'hurt', data: { id: 'x' } }), false);
  assert.equal(applyEvent(state, { name: 'alpha', data: {} }), false);
  assert.deepEqual(state, before);
});

test('a turn event with missing or wrong data is ignored', () => {
  const state = createGameState();
  assert.equal(applyEvent(state, { name: 'turn', data: undefined }), false);
  assert.equal(applyEvent(state, { name: 'turn', data: null }), false);
  assert.equal(applyEvent(state, { name: 'turn', data: { letter: 5, turn: 'p' } }), false);
  assert.equal(applyEvent(state, { name: 'turn', data: { letter: 'TH' } }), false);
  assert.equal(state.prompt, '');
});

test('a turn event without a count still works (count becomes 0)', () => {
  const state = createGameState();
  applyEvent(state, { name: 'turn', data: { letter: 'TH', turn: 'p' } });
  assert.equal(state.prompt, 'th');
  assert.equal(state.count, 0);
});

test('a start event clears the prompt but remembers who we are', () => {
  const state = createGameState();
  setMyId(state, 'me');
  applyEvent(state, turnEvent('THI', 2525, 'me'));
  assert.equal(applyEvent(state, { name: 'start', data: undefined }), true);
  assert.equal(state.prompt, '');
  assert.equal(state.turnId, null);
  assert.equal(state.myId, 'me');
});

test('isMyTurn: unknown until we know our own id and the game has started', () => {
  const state = createGameState();
  assert.equal(isMyTurn(state), null);
  applyEvent(state, turnEvent('THI', 1, 'player-1'));
  assert.equal(isMyTurn(state), null); // we still do not know who we are
});

test('isMyTurn: unknown (not "no") when we know our id but no turn has happened yet', () => {
  const state = createGameState();
  setMyId(state, 'me');
  assert.equal(isMyTurn(state), null);
  applyEvent(state, turnEvent('THI', 1, 'me'));
  applyEvent(state, { name: 'start', data: undefined }); // a new game: no turn yet
  assert.equal(isMyTurn(state), null);
});

test('isMyTurn: true when it is our turn, false when it is not', () => {
  const state = createGameState();
  setMyId(state, 'me');
  applyEvent(state, turnEvent('THI', 1, 'me'));
  assert.equal(isMyTurn(state), true);
  applyEvent(state, turnEvent('QU', 1, 'someone-else'));
  assert.equal(isMyTurn(state), false);
});

test('isMyTurn: learning our id AFTER the turn event still gives the right answer', () => {
  const state = createGameState();
  applyEvent(state, turnEvent('THI', 1, 'me'));
  setMyId(state, 'me');
  assert.equal(isMyTurn(state), true);
});

test('getSessionId: reads the player id out of the connection address', () => {
  assert.equal(getSessionId('wss://game.example/room/abc?sessionId=ZUTFRGcdj'), 'ZUTFRGcdj');
  assert.equal(getSessionId('wss://game.example/room?x=1&sessionId=q9&y=2'), 'q9');
});

test('getSessionId: returns null when there is no id or no valid address', () => {
  assert.equal(getSessionId('wss://game.example/room/abc'), null);
  assert.equal(getSessionId('not an address'), null);
  assert.equal(getSessionId(''), null);
  assert.equal(getSessionId(undefined), null);
});
