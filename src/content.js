// Runs in the extension's own private area of the page. It receives the raw messages that
// hook.js copied, works out which event each one is, keeps track of the game's state, and
// shows suggested words in the overlay box.

console.log('[defuser] content script is running on', location.href);

const state = createGameState();
let wordList = []; // filled in once words.txt has been loaded (below)
let minLength = SMALLEST_MIN_LENGTH; // set by the slider; starts at the smallest value, meaning "no limit"

// Work out the suggestions for the current prompt and draw the box.
function refresh() {
  showOverlay(
    makeOverlayText({
      prompt: state.prompt,
      count: state.count,
      myTurn: isMyTurn(state),
      words: getSuggestions(wordList, state, minLength),
      minLength: minLength,
    })
  );
}

// Draw the box with its slider. Moving the slider changes minLength and redraws the suggestions.
initOverlay({
  minLength: minLength,
  onMinLengthChange: function (newValue) {
    minLength = newValue;
    refresh();
  },
});

// Load the word list. `fetch` downloads a file; here the file is part of the extension itself.
fetch(browser.runtime.getURL('words.txt'))
  .then((response) => response.text())
  .then((text) => {
    wordList = loadWords(text);
    console.log('[defuser] loaded', wordList.length, 'words');
    refresh(); // in case a prompt arrived while the list was still loading
  })
  .catch((error) => console.log('[defuser] could not load words.txt:', error));

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

  if (applyEvent(state, event)) {
    console.log(
      '[defuser] prompt:', state.prompt,
      '| words the game counts:', state.count,
      '| my turn:', isMyTurn(state)
    );
    refresh();
  }
});
