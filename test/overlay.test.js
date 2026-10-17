// Tests for src/overlay.js. Run them with:  npm test
// (Only makeOverlayText is tested here: initOverlay and showOverlay draw on a real web page,
// which Node does not have.)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  makeOverlayText,
  cleanMinLength,
  SMALLEST_MIN_LENGTH,
  LARGEST_MIN_LENGTH,
} = require('../src/overlay.js');

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

test('the word count says "1 word" (not "1 words") and "2 words"', () => {
  assert.ok(makeOverlayText({ prompt: 'zq', count: 1, myTurn: true, words: [] }).includes('Prompt: ZQ (1 word)'));
  assert.ok(makeOverlayText({ prompt: 'zq', count: 2, myTurn: true, words: [] }).includes('Prompt: ZQ (2 words)'));
});

test('when the game gave no count (0) the prompt line has no count at all', () => {
  const text = makeOverlayText({ prompt: 'thi', count: 0, myTurn: true, words: ['thin'] });
  assert.ok(text.includes('Prompt: THI\n'));
  assert.ok(!text.includes('0 words'));
});

test('cleanMinLength: a valid saved value is kept', () => {
  assert.equal(cleanMinLength(2), 2);
  assert.equal(cleanMinLength(8), 8);
  assert.equal(cleanMinLength(15), 15);
});

test('cleanMinLength: nothing saved yet (undefined) gives the smallest value', () => {
  assert.equal(cleanMinLength(undefined), SMALLEST_MIN_LENGTH);
  assert.equal(cleanMinLength(null), SMALLEST_MIN_LENGTH);
});

test('cleanMinLength: things that are not whole numbers give the smallest value', () => {
  assert.equal(cleanMinLength('8'), SMALLEST_MIN_LENGTH);
  assert.equal(cleanMinLength(7.5), SMALLEST_MIN_LENGTH);
  assert.equal(cleanMinLength(NaN), SMALLEST_MIN_LENGTH);
  assert.equal(cleanMinLength({}), SMALLEST_MIN_LENGTH);
});

test('cleanMinLength: out-of-range whole numbers are moved to the nearest allowed value', () => {
  assert.equal(cleanMinLength(0), SMALLEST_MIN_LENGTH);
  assert.equal(cleanMinLength(-5), SMALLEST_MIN_LENGTH);
  assert.equal(cleanMinLength(99), LARGEST_MIN_LENGTH);
});

test('the letters still needed are shown in capitals under the prompt', () => {
  const text = makeOverlayText({ prompt: 'thi', count: 5, myTurn: true, words: ['thin'], neededLetters: 'qxz' });
  const lines = text.split('\n');
  assert.equal(lines[1], 'Prompt: THI (5 words)');
  assert.equal(lines[2], 'Letters left: QXZ');
});

test('the letters line is also shown when it is not our turn', () => {
  const text = makeOverlayText({ prompt: 'thi', count: 5, myTurn: false, words: [], neededLetters: 'qxz' });
  assert.ok(text.includes('Letters left: QXZ'));
});

test('no letters line when none are known or none are left', () => {
  assert.ok(!makeOverlayText({ prompt: 'thi', count: 5, myTurn: true, words: [], neededLetters: '' }).includes('Letters left'));
  assert.ok(!makeOverlayText({ prompt: 'thi', count: 5, myTurn: true, words: [] }).includes('Letters left'));
});
