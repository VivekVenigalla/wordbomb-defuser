// Runs in the extension's own private area of the page. It receives the raw messages that
// hook.js copied, works out which event each one is, keeps track of the game's state, and
// prints what it knows to the console.

console.log('[defuser] content script is running on', location.href);

const state = createGameState();

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
  }
});
