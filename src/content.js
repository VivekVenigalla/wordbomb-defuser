// Runs in the extension's own private area of the page. It receives the raw messages that
// hook.js copied, works out which event each one is, keeps track of the game's state, and
// shows suggested words in the overlay box.

console.log('[defuser] content script is running on', location.href);

const state = createGameState();
let wordList = []; // filled in once words.txt has been loaded (below)

// Work out the suggestions for the current prompt and draw the box.
function refresh() {
  let words = [];
  if (state.prompt !== '' && isMyTurn(state) !== false) {
    const matches = findWords(wordList, state.prompt);
    words = rankWords(matches, { maxLength: 12, limit: 5 });
  }

  showOverlay(
    makeOverlayText({
      prompt: state.prompt,
      count: state.count,
      myTurn: isMyTurn(state),
      words: words,
    })
  );
}

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
