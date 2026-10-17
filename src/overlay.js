// The overlay: a plain box on top of the game that shows the prompt, our suggested words,
// and a slider for the minimum word length.
//
//   makeOverlayText(info)   builds the text to show. (Pure: no browser needed, so it is tested.)
//   cleanMinLength(value)   turns a saved slider value into a safe one (see below).
//   initOverlay(options)    creates the box and the slider on the page. Call it once.
//   showOverlay(text)       changes the text inside the box.
//
// For makeOverlayText, `info` is  { prompt, count, myTurn, words, minLength }:
//   prompt      the letters, e.g. 'thi'  (empty string if no game is running)
//   count       how many words the game says fit the prompt
//   myTurn      true, false, or null when we do not know
//   words       the suggested words, best first
//   minLength   the slider's value (optional)
//   neededLetters   the letters still needed for the alphabet bonus, e.g. 'bcd' (optional)

const SMALLEST_MIN_LENGTH = 2; // a prompt has at least 2 letters, so a shorter minimum means nothing
const LARGEST_MIN_LENGTH = 15;

// The slider's value is saved between visits. Whatever comes back from storage might be missing
// or wrong (an old version, a typo, something else wrote to it), so we check it before using it.
// Anything that is not a whole number becomes the smallest value; a whole number that is too
// small or too large is moved to the nearest allowed value.
function cleanMinLength(value) {
  if (!Number.isInteger(value)) return SMALLEST_MIN_LENGTH;
  return Math.min(LARGEST_MIN_LENGTH, Math.max(SMALLEST_MIN_LENGTH, value));
}

// "1 word", "2 words". If the count is 0 we have no real number, so we say nothing about it.
function describeCount(count) {
  if (count <= 0) return '';
  return ' (' + count + (count === 1 ? ' word)' : ' words)');
}

function makeOverlayText(info) {
  const lines = ['Word Bomb Defuser'];

  if (info.prompt === '') {
    lines.push('Waiting for a game...');
    return lines.join('\n');
  }

  lines.push('Prompt: ' + info.prompt.toUpperCase() + describeCount(info.count));

  if (info.neededLetters) {
    lines.push('Letters left: ' + info.neededLetters.toUpperCase()); // empty or missing: say nothing
  }

  if (info.myTurn === false) {
    lines.push('Not your turn');
    return lines.join('\n'); // no suggestions until it is our turn
  }

  lines.push(info.myTurn === true ? 'Your turn' : 'Turn unknown (showing words anyway)');

  if (info.words.length === 0) {
    lines.push('No words found');
    if (info.minLength !== undefined && info.minLength > SMALLEST_MIN_LENGTH) {
      lines.push('(try a smaller minimum length)'); // the slider may be the reason
    }
  } else {
    info.words.forEach((word, index) => lines.push(index + 1 + '. ' + word));
  }
  return lines.join('\n');
}

// Builds the box on the page. `options` is { minLength, onMinLengthChange }:
// minLength is the slider's starting value, and onMinLengthChange is a function that
// we call with the new value every time the slider moves.
function initOverlay(options) {
  if (document.getElementById('defuser-overlay') !== null) return; // already built

  const box = document.createElement('div');
  box.id = 'defuser-overlay';
  box.style.cssText = [
    'position: fixed', // stay in place, on top of the page
    'top: 10px',
    'left: 10px',
    'z-index: 2147483647', // the biggest layer number: above everything else
    'background: white',
    'color: black',
    'border: 2px solid black',
    'padding: 8px',
    'font: 14px monospace',
    'pointer-events: none', // clicks pass through the box, so it never blocks the game...
  ].join('; ');

  const textArea = document.createElement('div');
  textArea.id = 'defuser-overlay-text';
  textArea.style.cssText = 'white-space: pre'; // keep our line breaks
  textArea.textContent = 'Word Bomb Defuser';

  // ...except for this row, which switches clicks back on so the slider can be used.
  const sliderRow = document.createElement('div');
  sliderRow.style.cssText = 'pointer-events: auto; margin-top: 8px';

  const label = document.createElement('span');
  label.textContent = 'Min length: ' + options.minLength + ' ';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(SMALLEST_MIN_LENGTH);
  slider.max = String(LARGEST_MIN_LENGTH);
  slider.step = '1';
  slider.value = String(options.minLength);

  slider.addEventListener('input', function () {
    // "input" fires continuously while the slider is dragged.
    label.textContent = 'Min length: ' + slider.value + ' ';
    options.onMinLengthChange(Number(slider.value));
  });
  slider.addEventListener('change', function () {
    // "change" fires when you let go. Give the keyboard back to the game: otherwise the slider
    // keeps focus and the arrow keys would move it instead of reaching the game.
    slider.blur();
  });

  sliderRow.appendChild(label);
  sliderRow.appendChild(slider);
  box.appendChild(textArea);
  box.appendChild(sliderRow);
  document.documentElement.appendChild(box);
}

function showOverlay(text) {
  const textArea = document.getElementById('defuser-overlay-text');
  if (textArea !== null) textArea.textContent = text;
}

if (typeof module !== 'undefined') {
  module.exports = {
    makeOverlayText,
    cleanMinLength,
    initOverlay,
    showOverlay,
    SMALLEST_MIN_LENGTH,
    LARGEST_MIN_LENGTH,
  };
}
