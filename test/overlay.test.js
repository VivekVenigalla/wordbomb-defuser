// Tests for src/overlay.js. Run them with:  npm test
// (Only makeOverlayText is tested here: initOverlay and showOverlay draw on a real web page,
// which Node does not have.)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeOverlayText, SMALLEST_MIN_LENGTH, LARGEST_MIN_LENGTH } = require('../src/overlay.js');

test('with no prompt it says it is waiting for a game', () => {
  const text = makeOverlayText({ prompt: '', count: 0, myTurn: null, words: [] });
  assert.equal(text, 'Word Bomb Defuser\nWaiting for a game...');
});

test('on our turn it shows the prompt in capitals and a numbered list', () => {
  const text = makeOverlayText({ prompt: 'thi', count: 2525, myTurn: true, words: ['thin', 'this'] });
  assert.equal(
    text,
    ['Word Bomb Defuser', 'Prompt: THI (2525 words)', 'Your turn', '1. thin', '2. this'].join('\n')
  );
});

test('when it is not our turn it shows no words', () => {
  const text = makeOverlayText({ prompt: 'thi', count: 10, myTurn: false, words: ['thin'] });
  assert.ok(text.includes('Not your turn'));
  assert.ok(!text.includes('thin'));
  assert.ok(!text.includes('1.'));
});

test('when we cannot tell whose turn it is, it still shows words and says so', () => {
  const text = makeOverlayText({ prompt: 'qu', count: 5, myTurn: null, words: ['quit'] });
  assert.ok(text.includes('Turn unknown'));
  assert.ok(text.includes('1. quit'));
});

test('on our turn with nothing found it says so', () => {
  const text = makeOverlayText({ prompt: 'zzq', count: 0, myTurn: true, words: [] });
  assert.ok(text.includes('No words found'));
  assert.ok(!text.includes('1.'));
});

test('the numbers go up by one for each word', () => {
  const text = makeOverlayText({ prompt: 'a', count: 1, myTurn: true, words: ['a1', 'b2', 'c3', 'd4', 'e5'] });
  assert.ok(text.includes('1. a1') && text.includes('3. c3') && text.includes('5. e5'));
});

test('when nothing is found and the slider is raised, it hints at the slider', () => {
  const text = makeOverlayText({ prompt: 'thi', count: 9, myTurn: true, words: [], minLength: 12 });
  assert.ok(text.includes('No words found'));
  assert.ok(text.includes('try a smaller minimum length'));
});

test('no slider hint when the slider is at its smallest, or when words were found', () => {
  const none = makeOverlayText({ prompt: 'zzq', count: 0, myTurn: true, words: [], minLength: 2 });
  assert.ok(!none.includes('try a smaller'));
  const some = makeOverlayText({ prompt: 'thi', count: 9, myTurn: true, words: ['thing'], minLength: 12 });
  assert.ok(!some.includes('try a smaller'));
  const unknown = makeOverlayText({ prompt: 'zzq', count: 0, myTurn: true, words: [] });
  assert.ok(!unknown.includes('try a smaller'));
});

test('the slider range makes sense', () => {
  assert.ok(SMALLEST_MIN_LENGTH >= 2);
  assert.ok(LARGEST_MIN_LENGTH > SMALLEST_MIN_LENGTH);
});
