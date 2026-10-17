// Runs in the extension's own private area of the page. It receives the raw messages that
// hook.js copied, works out which event each one is, keeps track of the game's state, and
// shows suggested words in the overlay box.

console.log('[defuser] content script is running on', location.href);

const state = createGameState();
let wordList = []; // filled in once words.txt has been loaded (below)
let tiers = new Map(); // how common each word is; filled in once tiers.txt has been loaded
let enabled = true; // the toolbar button's on/off switch (see background.js)
let hidden = false; // true while the box is hidden with Alt+B
let minLength = SMALLEST_MIN_LENGTH; // set by the slider; the smallest value means "no limit"

// The box is visible only when the extension is ON and the box was not hidden with Alt+B.
function updateVisibility() {
  setOverlayVisible(enabled && !hidden);
}

// Work out the suggestions for the current prompt and draw the box.
function refresh() {
  if (!enabled) return; // switched off: do no work (we still keep track of the game, see below)
  showOverlay(
    makeOverlayText({
      prompt: state.prompt,
      count: state.count,
      myTurn: isMyTurn(state),
      words: getSuggestions(wordList, state, minLength, tiers),
      minLength: minLength,
      neededLetters: state.neededLetters,
    })
  );
}

// Alt+B hides or shows the box. We listen on the whole page. The `true` at the end means
// "look at key presses before the page does", so the shortcut works wherever focus is.
document.addEventListener(
  'keydown',
  function (keyEvent) {
    if (!enabled) return; // switched off: leave every key alone
    if (!isToggleShortcut(keyEvent)) return;
    keyEvent.preventDefault(); // stop Alt+B from typing a symbol somewhere
    hidden = !hidden;
    browser.storage.local.set({ hidden: hidden }).catch(() => {}); // remember it for next time
    updateVisibility();
  },
  true
);

// Draw the box with its slider. First we ask the browser's storage for the values saved last
// time: the slider's position, and whether the box was hidden. (`browser.storage.local` is a
// small private notebook that belongs to the extension and survives reloads and restarts.)
// If that fails, we just start from the defaults.
browser.storage.local
  .get(['minLength', 'hidden', 'enabled'])
  .catch(() => ({}))
  .then((saved) => {
    minLength = cleanMinLength(saved.minLength);
    hidden = saved.hidden === true; // anything other than a real "true" means: show the box
    enabled = isEnabledValue(saved.enabled);
    initOverlay({
      minLength: minLength,
      onMinLengthChange: function (newValue) {
        minLength = newValue;
        browser.storage.local.set({ minLength: newValue }).catch(() => {}); // remember it for next time
        refresh();
      },
    });
    updateVisibility();
    refresh();
  });

// The toolbar button (background.js) saves a new on/off value. We are told when it changes.
// While the extension is off we still keep track of the game, so switching it back on in the
// middle of a round immediately shows the right prompt.
browser.storage.onChanged.addListener(function (changes, area) {
  if (area !== 'local' || !changes.enabled) return;
  enabled = isEnabledValue(changes.enabled.newValue);
  updateVisibility();
  refresh();
});

// Load the two data files. `fetch` downloads a file; here the files are part of the extension itself.
// Promise.all means "do both downloads, and continue when both are finished".
function loadText(fileName) {
  return fetch(browser.runtime.getURL(fileName)).then((response) => response.text());
}

Promise.all([loadText('words.txt'), loadText('tiers.txt')])
  .then(([wordsText, tiersText]) => {
    wordList = loadWords(wordsText);
    tiers = loadTiers(tiersText);
    console.log('[defuser] loaded', wordList.length, 'words and', tiers.size, 'word tiers');
    refresh(); // in case a prompt arrived while the files were still loading
  })
  .catch((error) => console.log('[defuser] could not load the word files:', error));

window.addEventListener('message', function (message) {
  // The page can post messages too, so make sure this one is ours.
  if (message.origin !== location.origin) return;
  if (!message.data || message.data.source !== 'defuser') return;

  // Learn our own player id from the address of the connection the message came from.
  const id = getSessionId(message.data.url);
  if (id !== null && id !== state.myId) {
    setMyId(state, id);
    console.log('[defuser] my player id:', id);
  }

  const event = parseFrame(message.data.bytes);
  if (event === null) return; // not a game event we understand

  const changed = applyEvent(state, event); // update our memory first, then report on it

  // While we are still learning what these two events mean, print them so they can be inspected.
  if (event.name === 'user-letter-healths') console.log('[defuser] letters left:', state.neededLetters || '(none)', '| raw:', event.data);
  if (event.name === 'alpha') console.log('[defuser] alpha event:', event.data);

  if (changed) {
    console.log(
      '[defuser] prompt:', state.prompt,
      '| words the game counts:', state.count,
      '| my turn:', isMyTurn(state)
    );
    refresh();
  }
});
