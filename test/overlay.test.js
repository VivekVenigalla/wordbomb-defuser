// Tests for src/overlay.js. Run them with:  npm test
// Only the "thinking" parts are tested here (makeOverlayModel and friends). The drawing part
// (initOverlay, showOverlay) needs a real web page, which Node does not have.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  makeOverlayModel,
  splitWord,
  describeCount,
  cleanMinLength,
  isToggleShortcut,
  SMALLEST_MIN_LENGTH,
  LARGEST_MIN_LENGTH,
} = require('../src/overlay.js');

// A model for a normal "it is your turn" situation, with anything we want to change.
function yourTurn(changes) {
  return makeOverlayModel({ prompt: 'thi', count: 2525, myTurn: true, words: ['thin', 'this'], ...changes });
}

// ---- the waiting state -----------------------------------------------------------------------

test('with no prompt the model is in the "waiting" state with nothing else to show', () => {
  const model = makeOverlayModel({ prompt: '', count: 0, myTurn: null, words: [], neededLetters: 'abc' });
  assert.equal(model.state, 'waiting');
  assert.equal(model.statusLabel, 'Waiting for a game');
  assert.equal(model.prompt, '');
  assert.equal(model.countText, '');
  assert.equal(model.lettersLeft, ''); // not shown before a game
  assert.deepEqual(model.words, []);
  assert.equal(model.emptyNote, '');
});

// ---- the prompt and the count ----------------------------------------------------------------

test('the prompt is shown in capitals with the game\'s word count', () => {
  const model = yourTurn();
  assert.equal(model.prompt, 'THI');
  assert.equal(model.countText, '2525 words');
});

test('describeCount: "1 word" (not "1 words"), "2 words", and nothing when there is no count', () => {
  assert.equal(describeCount(1), '1 word');
  assert.equal(describeCount(2), '2 words');
  assert.equal(describeCount(2525), '2525 words');
  assert.equal(describeCount(0), '');
  assert.equal(describeCount(-3), '');
});

// ---- whose turn ------------------------------------------------------------------------------

test('our turn: state "yours", with suggestions', () => {
  const model = yourTurn();
  assert.equal(model.state, 'yours');
  assert.equal(model.statusLabel, 'Your turn');
  assert.equal(model.words.length, 2);
});

test('not our turn: state "theirs", and no suggestions at all', () => {
  const model = yourTurn({ myTurn: false });
  assert.equal(model.state, 'theirs');
  assert.equal(model.statusLabel, 'Not your turn');
  assert.deepEqual(model.words, []);
  assert.equal(model.emptyNote, ''); // an empty list is expected here, so no "No words found"
  assert.equal(model.prompt, 'THI'); // but the prompt is still shown
});

test('turn unknown: still shows the suggestions, and says it does not know', () => {
  const model = yourTurn({ myTurn: null });
  assert.equal(model.state, 'unknown');
  assert.equal(model.statusLabel, 'Turn unknown');
  assert.equal(model.words.length, 2);
});

// ---- the suggested words ---------------------------------------------------------------------

test('splitWord: cuts a word around the prompt so the prompt can be coloured', () => {
  assert.deepEqual(splitWord('anything', 'thi'), { before: 'any', match: 'thi', after: 'ng' });
  assert.deepEqual(splitWord('this', 'thi'), { before: '', match: 'thi', after: 's' });
  assert.deepEqual(splitWord('nothing', 'thing'), { before: 'no', match: 'thing', after: '' });
});

test('splitWord: capital letters in the prompt are fine', () => {
  assert.deepEqual(splitWord('anything', 'THI'), { before: 'any', match: 'thi', after: 'ng' });
});

test('splitWord: if the prompt is somehow not in the word, the whole word is just shown plainly', () => {
  assert.deepEqual(splitWord('cat', 'xyz'), { before: 'cat', match: '', after: '' });
});

test('splitWord: the three parts always add up to the original word', () => {
  for (const word of ['thing', 'anything', 'thi', 'ething']) {
    const { before, match, after } = splitWord(word, 'thi');
    assert.equal(before + match + after, word);
  }
});

test('the model keeps the words in the order given', () => {
  const model = yourTurn({ words: ['thin', 'this', 'thing'] });
  assert.deepEqual(model.words.map((w) => w.before + w.match + w.after), ['thin', 'this', 'thing']);
});

// ---- the letters still needed ----------------------------------------------------------------

test('letters left are shown in capitals', () => {
  assert.equal(yourTurn({ neededLetters: 'qxz' }).lettersLeft, 'QXZ');
});

test('letters left are also shown when it is not our turn', () => {
  assert.equal(yourTurn({ myTurn: false, neededLetters: 'qxz' }).lettersLeft, 'QXZ');
});

test('no letters left (or not known): an empty string', () => {
  assert.equal(yourTurn({ neededLetters: '' }).lettersLeft, '');
  assert.equal(yourTurn().lettersLeft, '');
});

test('each word lists the needed letters it fills, in capitals', () => {
  const model = yourTurn({ words: ['anything', 'thinking', 'this'], neededLetters: 'gkwy' });
  assert.deepEqual(model.words.map((w) => w.filled), ['GY', 'GK', '']);
});

test('no letters filled when none are needed or none are known', () => {
  assert.ok(yourTurn({ neededLetters: '' }).words.every((w) => w.filled === ''));
  assert.ok(yourTurn().words.every((w) => w.filled === ''));
});

// ---- when there is nothing to suggest --------------------------------------------------------

test('our turn with no words: a "No words found" note', () => {
  const model = yourTurn({ words: [] });
  assert.equal(model.emptyNote, 'No words found.');
});

test('no words and the slider raised: the note suggests lowering it', () => {
  const model = yourTurn({ words: [], minLength: 12 });
  assert.ok(model.emptyNote.includes('No words found.'));
  assert.ok(model.emptyNote.includes('Try a smaller minimum length.'));
});

test('no slider hint when the slider is at its smallest, or its value is unknown', () => {
  assert.ok(!yourTurn({ words: [], minLength: SMALLEST_MIN_LENGTH }).emptyNote.includes('smaller'));
  assert.ok(!yourTurn({ words: [] }).emptyNote.includes('smaller'));
});

test('no note when there are words', () => {
  assert.equal(yourTurn({ minLength: 12 }).emptyNote, '');
});

// ---- the saved slider value ------------------------------------------------------------------

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

test('the slider range makes sense', () => {
  assert.ok(SMALLEST_MIN_LENGTH >= 2);
  assert.ok(LARGEST_MIN_LENGTH > SMALLEST_MIN_LENGTH);
});

// ---- the Alt+B shortcut ----------------------------------------------------------------------

test('isToggleShortcut: Alt+B is the shortcut', () => {
  assert.equal(isToggleShortcut({ altKey: true, code: 'KeyB' }), true);
});

test('isToggleShortcut: B on its own is not (the player is typing a word!)', () => {
  assert.equal(isToggleShortcut({ altKey: false, code: 'KeyB' }), false);
  assert.equal(isToggleShortcut({ code: 'KeyB' }), false);
});

test('isToggleShortcut: Alt with a different key is not', () => {
  assert.equal(isToggleShortcut({ altKey: true, code: 'KeyA' }), false);
  assert.equal(isToggleShortcut({ altKey: true, code: 'Digit1' }), false);
});

test('isToggleShortcut: Alt+B together with another modifier is not', () => {
  assert.equal(isToggleShortcut({ altKey: true, ctrlKey: true, code: 'KeyB' }), false);
  assert.equal(isToggleShortcut({ altKey: true, metaKey: true, code: 'KeyB' }), false);
  assert.equal(isToggleShortcut({ altKey: true, shiftKey: true, code: 'KeyB' }), false);
});
