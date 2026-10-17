// The extension's memory of the game: what the current prompt is, and whose turn it is.
// It is a plain object. These methods create it and update it from game events.
//
//   createGameState()            a fresh, empty state
//   getSessionId(url)            your player id, taken from the game connection's address
//   setMyId(state, id)           remember which player id is you
//   applyEvent(state, event)     update the state from one event (as made by parseFrame)
//   isMyTurn(state)              true, false, or null if we do not know our own id yet

function createGameState() {
  return {
    myId: null, // our own player id (unknown until we learn it)
    prompt: '', // the letters that must be in the word, in lowercase, e.g. 'thi'
    count: 0, // how many words the game says fit this prompt
    turnId: null, // the id of the player whose turn it is
    neededLetters: '', // letters still needed for the alphabet bonus, e.g. 'bcdfg' (see applyEvent)
  };
}

// The game connects with an address like  wss://server/room?sessionId=abc123
// and "abc123" is our own player id. Returns null if the address has no sessionId.
function getSessionId(url) {
  try {
    return new URL(url).searchParams.get('sessionId');
  } catch (error) {
    return null; // not a valid address at all
  }
}

function setMyId(state, id) {
  state.myId = id;
}

// Updates the state from one event. Returns true if the state changed, so the caller
// knows whether there is anything new to show.
function applyEvent(state, event) {
  if (event.name === 'start') {
    // A new game began: forget the old prompt. (We keep myId: we are still the same player.)
    state.prompt = '';
    state.count = 0;
    state.turnId = null;
    state.neededLetters = '';
    return true;
  }

  if (event.name === 'user-letter-healths') {
    // The game sends something like { A: 1, B: 1, C: 0, ... }: a number for each letter.
    // ASSUMPTION (not yet confirmed in a real game): a letter with a number above 0 is a letter
    // we still need for the alphabet bonus, and using it brings the number down to 0.
    const data = event.data;
    if (!data || typeof data !== 'object') return false;
    let needed = '';
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
      const health = data[letter.toUpperCase()];
      if (typeof health === 'number' && health > 0) needed += letter;
    }
    state.neededLetters = needed;
    return true;
  }

  if (event.name === 'turn') {
    const data = event.data;
    // Make sure the data looks the way we expect before trusting it.
    if (!data || typeof data.letter !== 'string' || typeof data.turn !== 'string') return false;
    state.prompt = data.letter.toLowerCase(); // the game sends capitals; our word list is lowercase
    state.count = typeof data.count === 'number' ? data.count : 0;
    state.turnId = data.turn;
    return true;
  }

  return false; // some other event: nothing for us to remember
}

// We work this out each time instead of storing it, so it can never be out of date.
function isMyTurn(state) {
  if (state.myId === null || state.turnId === null) return null; // cannot tell yet
  return state.turnId === state.myId;
}

if (typeof module !== 'undefined') {
  module.exports = { createGameState, getSessionId, setMyId, applyEvent, isMyTurn };
}
