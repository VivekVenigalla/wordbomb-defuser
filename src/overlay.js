// The overlay: a box on top of the game that shows the prompt, whose turn it is, the letters
// still needed, our suggested words, and a slider for the minimum word length.
//
// The work is split in two so that the thinking can be tested without a web page:
//
//   makeOverlayModel(info)   decides WHAT to show. Pure: no browser needed, so it is tested.
//   initOverlay(options)     builds the empty box on the page. Call it once.
//   showOverlay(model)       fills the box in from a model.
//   setOverlayVisible(yes)   hides or shows the whole box.
//
// There are also two small helpers: cleanMinLength (checks a saved slider value) and
// isToggleShortcut (is this key press Alt+B?). How the box LOOKS is in overlay-style.js.
//
// For makeOverlayModel, `info` is  { prompt, count, myTurn, words, minLength, neededLetters }:
//   prompt          the letters, e.g. 'thi'  (empty string if no game is running)
//   count           how many words the game says fit the prompt
//   myTurn          true, false, or null when we do not know
//   words           the suggested words, best first
//   minLength       the slider's value (optional)
//   neededLetters   the letters still needed for the alphabet bonus, e.g. 'bcd' (optional)

// In Node (the tests) we load the other files ourselves; in the browser the manifest already did.
const overlayParts =
  typeof require !== 'undefined'
    ? { neededLettersIn: require('./rank-words.js').neededLettersIn, STYLE: require('./overlay-style.js').OVERLAY_STYLE }
    : { neededLettersIn, STYLE: OVERLAY_STYLE };

const SMALLEST_MIN_LENGTH = 2; // a prompt has at least 2 letters, so a shorter minimum means nothing
const LARGEST_MIN_LENGTH = 15;

const STATUS_LABELS = {
  waiting: 'Waiting for a game',
  yours: 'Your turn',
  theirs: 'Not your turn',
  unknown: 'Turn unknown',
};

// "1 word", "2 words". If the count is 0 we have no real number, so we say nothing about it.
function describeCount(count) {
  if (count <= 0) return '';
  return count + (count === 1 ? ' word' : ' words');
}

// Cut a word into three parts around the prompt, so the prompt letters can be coloured:
// splitWord('anything', 'thi')  ->  { before: 'an', match: 'thi', after: 'ng' }
function splitWord(word, prompt) {
  const start = word.indexOf(prompt.toLowerCase());
  if (start === -1) return { before: word, match: '', after: '' }; // should not happen: just show the word
  return {
    before: word.slice(0, start),
    match: word.slice(start, start + prompt.length),
    after: word.slice(start + prompt.length),
  };
}

// Decides what the box should show. Returns a plain object (the "model"):
//   state        'waiting' | 'yours' | 'theirs' | 'unknown'
//   statusLabel  the text for the turn label, e.g. 'Your turn'
//   prompt       the prompt in capitals ('' while waiting)
//   countText    e.g. '2525 words' ('' if unknown)
//   lettersLeft  the needed letters in capitals ('' if none or unknown)
//   words        a list of { before, match, after, filled } (empty when no suggestions apply)
//   emptyNote    a message to show when we should have suggestions but have none
function makeOverlayModel(info) {
  let state = 'unknown';
  if (info.prompt === '') state = 'waiting';
  else if (info.myTurn === true) state = 'yours';
  else if (info.myTurn === false) state = 'theirs';

  const model = {
    state: state,
    statusLabel: STATUS_LABELS[state],
    prompt: info.prompt.toUpperCase(),
    countText: state === 'waiting' ? '' : describeCount(info.count),
    lettersLeft: state === 'waiting' ? '' : (info.neededLetters || '').toUpperCase(),
    words: [],
    emptyNote: '',
  };

  // Suggestions are only shown on our turn (or when we cannot tell whose turn it is).
  if (state === 'yours' || state === 'unknown') {
    model.words = info.words.map(function (word) {
      const parts = splitWord(word, info.prompt);
      // If the word uses letters we still need, remember which, e.g. 'GY' for "anything".
      parts.filled = overlayParts.neededLettersIn(word, info.neededLetters).toUpperCase();
      return parts;
    });
    if (model.words.length === 0) {
      model.emptyNote = 'No words found.';
      if (info.minLength !== undefined && info.minLength > SMALLEST_MIN_LENGTH) {
        model.emptyNote += ' Try a smaller minimum length.'; // the slider may be the reason
      }
    }
  }
  return model;
}

// The slider's value is saved between visits. Whatever comes back from storage might be missing
// or wrong (an old version, a typo, something else wrote to it), so we check it before using it.
// Anything that is not a whole number becomes the smallest value; a whole number that is too
// small or too large is moved to the nearest allowed value.
function cleanMinLength(value) {
  if (!Number.isInteger(value)) return SMALLEST_MIN_LENGTH;
  return Math.min(LARGEST_MIN_LENGTH, Math.max(SMALLEST_MIN_LENGTH, value));
}

// Is this key press the shortcut that hides or shows the box? It is Alt+B, with no other
// modifier keys held. We look at `code` (which physical key was pressed) rather than the letter
// it types, because Alt+B types a different symbol on a Mac keyboard.
function isToggleShortcut(event) {
  return (
    event.altKey === true &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    event.code === 'KeyB'
  );
}

// ---------------------------------------------------------------------------------------------
// Drawing. Everything below needs a real web page.
// ---------------------------------------------------------------------------------------------

let overlayView = null; // the parts of the box we change later; filled in by initOverlay

// Make an element with some style (and optionally some text) in one go.
function makeElement(tag, style, text) {
  const element = document.createElement(tag);
  Object.assign(element.style, style); // copy each rule onto the element
  if (text !== undefined) element.textContent = text;
  return element;
}

// Builds the box on the page. `options` is { minLength, onMinLengthChange }:
// minLength is the slider's starting value, and onMinLengthChange is a function that
// we call with the new value every time the slider moves.
function initOverlay(options) {
  if (document.getElementById('defuser-overlay') !== null) return; // already built
  const S = overlayParts.STYLE;

  const card = makeElement('div', S.card);
  card.id = 'defuser-overlay';

  // Top row: the prompt (with the word count under it) and the turn label.
  const header = makeElement('div', S.header);
  const promptBlock = makeElement('div', {});
  const prompt = makeElement('div', S.prompt);
  const count = makeElement('div', S.count);
  const pill = makeElement('div', S.pillBase);
  promptBlock.appendChild(prompt);
  promptBlock.appendChild(count);
  header.appendChild(promptBlock);
  header.appendChild(pill);

  // "Letters left" and its chips.
  const lettersBlock = makeElement('div', S.lettersBlock);
  const chips = makeElement('div', S.chips);
  lettersBlock.appendChild(makeElement('div', S.sectionLabel, 'Letters left'));
  lettersBlock.appendChild(chips);

  // The suggested words, and the message shown when there are none.
  const words = makeElement('div', S.words);
  const note = makeElement('div', S.note);

  // The slider. The label says what it is; the value updates as you drag.
  const controls = makeElement('div', S.controls);
  const controlsRow = makeElement('div', S.controlsRow);
  const valueLabel = makeElement('span', S.controlsValue, String(options.minLength));
  controlsRow.appendChild(makeElement('span', {}, 'Minimum word length'));
  controlsRow.appendChild(valueLabel);

  const slider = makeElement('input', S.slider);
  slider.type = 'range';
  slider.min = String(SMALLEST_MIN_LENGTH);
  slider.max = String(LARGEST_MIN_LENGTH);
  slider.step = '1';
  slider.value = String(options.minLength);
  slider.addEventListener('input', function () {
    // "input" fires continuously while the slider is dragged.
    valueLabel.textContent = slider.value;
    options.onMinLengthChange(Number(slider.value));
  });
  slider.addEventListener('change', function () {
    // "change" fires when you let go. Give the keyboard back to the game: otherwise the slider
    // keeps focus and the arrow keys would move it instead of reaching the game.
    slider.blur();
  });

  controls.appendChild(controlsRow);
  controls.appendChild(slider);
  controls.appendChild(makeElement('div', S.hint, 'Alt+B hides or shows this box'));

  card.appendChild(header);
  card.appendChild(lettersBlock);
  card.appendChild(words);
  card.appendChild(note);
  card.appendChild(controls);
  document.documentElement.appendChild(card);

  overlayView = { prompt, count, pill, lettersBlock, chips, words, note };
  showOverlay(makeOverlayModel({ prompt: '', count: 0, myTurn: null, words: [] })); // start in the "waiting" look
}

// Fills the box in from a model (see makeOverlayModel).
function showOverlay(model) {
  if (overlayView === null) return; // the box has not been built yet
  const S = overlayParts.STYLE;
  const view = overlayView;

  // Prompt and word count. Before a game starts the prompt is a dim dash.
  view.prompt.textContent = model.prompt === '' ? '—' : model.prompt;
  Object.assign(view.prompt.style, S.prompt, model.prompt === '' ? S.promptEmpty : { opacity: '1' });
  view.count.textContent = model.countText;

  // The turn label: its shared look plus the colours for this situation.
  view.pill.textContent = model.statusLabel;
  Object.assign(view.pill.style, S.pillBase, S.pill[model.state]);

  // The letters still needed: one small chip per letter.
  view.lettersBlock.style.display = model.lettersLeft === '' ? 'none' : 'block';
  view.chips.textContent = ''; // empties the row before refilling it
  for (const letter of model.lettersLeft) view.chips.appendChild(makeElement('div', S.chip, letter));

  // The suggested words: the best one gets a highlighted row.
  view.words.textContent = '';
  model.words.forEach(function (word, index) {
    const row = makeElement('div', index === 0 ? Object.assign({}, S.row, S.rowBest) : S.row);
    const text = makeElement('div', S.word);
    text.appendChild(makeElement('span', {}, word.before));
    text.appendChild(makeElement('span', S.wordMatch, word.match));
    text.appendChild(makeElement('span', {}, word.after));
    row.appendChild(text);
    if (word.filled !== '') row.appendChild(makeElement('div', S.filled, '+' + word.filled));
    view.words.appendChild(row);
  });

  view.note.textContent = model.emptyNote;
  view.note.style.display = model.emptyNote === '' ? 'none' : 'block';
}

// Hides or shows the whole box. (Everything keeps running while it is hidden.)
function setOverlayVisible(visible) {
  const box = document.getElementById('defuser-overlay');
  if (box !== null) box.style.display = visible ? '' : 'none'; // '' means "back to normal"
}

if (typeof module !== 'undefined') {
  module.exports = {
    makeOverlayModel,
    splitWord,
    describeCount,
    cleanMinLength,
    isToggleShortcut,
    initOverlay,
    showOverlay,
    setOverlayVisible,
    SMALLEST_MIN_LENGTH,
    LARGEST_MIN_LENGTH,
  };
}
