// parseFrame: looks at ONE message from the game and tells us what event it is.
//
//   parseFrame(bytes)  ->  { name: 'turn', data: { letter: 'THI', ... } }
//                          or null if the message is not a game event we understand
//
// How the game lays out a message (we worked this out by watching real ones):
//   byte 0       the number 13 means "this message is an event". Other numbers (like 15)
//                are other kinds of messages that we do not need, so we skip them.
//   next value   the event's name, as text: 'turn', 'hurt', 'start', ...
//   next value   the event's data (not every event has any)
// Each "value" is in the MessagePack format, so `decode` reads them.

// In Node (the tests) we load decode.js ourselves. In the browser, decode.js is loaded by
// the manifest before this file, so `decode` already exists as a global function.
const decodeValue = typeof require !== 'undefined' ? require('./decode.js').decode : decode;

const EVENT_MARKER = 13;

function parseFrame(bytes) {
  // Too short to hold a marker plus a name, or not an event: not interesting.
  if (bytes.length < 2 || bytes[0] !== EVENT_MARKER) return null;

  try {
    const nameResult = decodeValue(bytes, 1); // start at 1, just after the marker
    if (typeof nameResult.value !== 'string') return null; // an event's name is always text

    // Some events are only a name. If there are bytes left, the next value is the data.
    let data;
    if (nameResult.offset < bytes.length) {
      data = decodeValue(bytes, nameResult.offset).value;
    }
    return { name: nameResult.value, data };
  } catch (error) {
    // decode throws on a damaged or unfamiliar message. A bad message should never
    // crash the extension, so we treat it as "nothing to see here".
    return null;
  }
}

if (typeof module !== 'undefined') module.exports = { parseFrame };
