// Small helpers for building the raw bytes that the tests feed to decode and parseFrame.
// (This file lives outside the test/ folder on purpose: `npm test` runs everything inside test/.)

// The bytes for a short piece of text: one type byte (which includes the length), then the letters.
function text(t) {
  return [0xa0 | t.length, ...new TextEncoder().encode(t)];
}

// Turns a plain list of numbers into the Uint8Array that decode expects.
// Used like:  bytes(13, ...text('turn'), 0x81, ...)
function bytes(...numbers) {
  return Uint8Array.from(numbers);
}

module.exports = { text, bytes };
