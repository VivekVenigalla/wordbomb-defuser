// Tests for src/decode.js. Run them with:  npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { decode } = require('../src/decode.js');

// Helper: build the bytes for a short piece of text (type byte, then the letters).
function text(t) {
  return [0xa0 | t.length, ...new TextEncoder().encode(t)];
}

// Helper: turn a plain list of numbers into the Uint8Array that decode expects.
function bytes(...numbers) {
  return Uint8Array.from(numbers);
}

test('small positive numbers are stored in the type byte itself', () => {
  assert.deepEqual(decode(bytes(0)), { value: 0, offset: 1 });
  assert.deepEqual(decode(bytes(42)), { value: 42, offset: 1 });
  assert.deepEqual(decode(bytes(127)), { value: 127, offset: 1 });
});

test('small negative numbers', () => {
  assert.equal(decode(bytes(0xff)).value, -1);
  assert.equal(decode(bytes(0xe0)).value, -32);
});

test('bigger numbers use extra bytes', () => {
  assert.equal(decode(bytes(0xcc, 200)).value, 200); // 1 extra byte
  assert.equal(decode(bytes(0xcd, 0x09, 0xdd)).value, 2525); // 2 extra bytes: 9*256 + 221
  assert.equal(decode(bytes(0xce, 0, 1, 0, 0)).value, 65536); // 4 extra bytes
  assert.equal(decode(bytes(0xd0, 0x80)).value, -128);
});

test('decimals', () => {
  assert.equal(decode(bytes(0xca, 0x3f, 0xc0, 0x00, 0x00)).value, 1.5);
  assert.equal(decode(bytes(0xcb, 0x3f, 0xf8, 0, 0, 0, 0, 0, 0)).value, 1.5);
});

test('null, true and false', () => {
  assert.equal(decode(bytes(0xc0)).value, null);
  assert.equal(decode(bytes(0xc3)).value, true);
  assert.equal(decode(bytes(0xc2)).value, false);
});

test('text', () => {
  assert.equal(decode(bytes(...text('turn'))).value, 'turn');
  assert.equal(decode(bytes(0xa0)).value, ''); // empty text
});

test('text of 16 to 31 letters still fits in the type byte', () => {
  const t = 'abcdefghijklmnopqrstuvwxyz'; // 26 letters
  assert.equal(decode(bytes(...text(t))).value, t);
});

test('long text (longer than 31 bytes) uses an extra length byte', () => {
  const long = 'x'.repeat(40);
  const encoded = bytes(0xd9, 40, ...new TextEncoder().encode(long));
  assert.equal(decode(encoded).value, long);
});

test('lists', () => {
  assert.deepEqual(decode(bytes(0x93, 1, 2, 3)).value, [1, 2, 3]);
  assert.deepEqual(decode(bytes(0x90)).value, []);
});

test('objects', () => {
  const encoded = bytes(0x81, ...text('a'), 7); // { a: 7 }
  assert.deepEqual(decode(encoded).value, { a: 7 });
});

test('values nested inside each other', () => {
  // { list: [1, { deep: true }] }
  const encoded = bytes(0x81, ...text('list'), 0x92, 1, 0x81, ...text('deep'), 0xc3);
  assert.deepEqual(decode(encoded).value, { list: [1, { deep: true }] });
});

test('offset: can start in the middle and report where the value ended', () => {
  const encoded = bytes(99, 99, ...text('hi'), 5); // two junk bytes, then "hi", then 5
  const first = decode(encoded, 2);
  assert.deepEqual(first, { value: 'hi', offset: 5 });
  const second = decode(encoded, first.offset);
  assert.deepEqual(second, { value: 5, offset: 6 });
});

test('a real game message: type byte 13, then the name, then the data', () => {
  const message = bytes(
    0x0d, // the game's "this message is an event" marker (not part of MessagePack)
    ...text('turn'),
    0x83, // an object with 3 pairs
    ...text('letter'), ...text('THI'),
    ...text('count'), 0xcd, 0x09, 0xdd,
    ...text('turn'), ...text('ZUTFRGcdj'),
  );
  const name = decode(message, 1);
  const data = decode(message, name.offset);
  assert.equal(name.value, 'turn');
  assert.deepEqual(data.value, { letter: 'THI', count: 2525, turn: 'ZUTFRGcdj' });
  assert.equal(data.offset, message.length); // we used every byte
});

test('a message that is cut short throws an error', () => {
  assert.throws(() => decode(bytes(0xa5, 0x61)), /ended too early/); // says 5 letters, has 1
  assert.throws(() => decode(bytes(0xcd, 0x09)), /ended too early/); // number missing a byte
  assert.throws(() => decode(bytes()), /ended too early/); // nothing at all
});

test('a type byte we do not know throws an error', () => {
  assert.throws(() => decode(bytes(0xc1)), /unknown type byte 0xc1/);
});
