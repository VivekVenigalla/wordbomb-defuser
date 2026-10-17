// Tests for src/parse-frame.js. Run them with:  npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { text, bytes } = require('../helpers/bytes.js');
const { parseFrame } = require('../src/parse-frame.js');

test('an event with a name and data', () => {
  const frame = bytes(
    13, ...text('turn'),
    0x83, // object with 3 pairs
    ...text('letter'), ...text('THI'),
    ...text('count'), 0xcd, 0x09, 0xdd,
    ...text('turn'), ...text('ZUTFRGcdj'),
  );
  assert.deepEqual(parseFrame(frame), {
    name: 'turn',
    data: { letter: 'THI', count: 2525, turn: 'ZUTFRGcdj' },
  });
});

test('an event that is only a name has no data', () => {
  const result = parseFrame(bytes(13, ...text('countdown')));
  assert.equal(result.name, 'countdown');
  assert.equal(result.data, undefined);
});

test('the data can be a single number, not just an object', () => {
  assert.deepEqual(parseFrame(bytes(13, ...text('countdown'), 3)), { name: 'countdown', data: 3 });
});

test('messages that are not events (marker is not 13) are ignored', () => {
  assert.equal(parseFrame(bytes(15, 0x81, 1, 2)), null);
  assert.equal(parseFrame(bytes(10, ...text('turn'))), null);
});

test('empty and too-short messages are ignored', () => {
  assert.equal(parseFrame(bytes()), null);
  assert.equal(parseFrame(bytes(13)), null);
});

test('if the name is not text, it is not an event we understand', () => {
  assert.equal(parseFrame(bytes(13, 42, 1)), null);
});

test('a damaged message returns null instead of crashing', () => {
  assert.equal(parseFrame(bytes(13, 0xa9, 0x61)), null); // name says 9 letters, has 1
  assert.equal(parseFrame(bytes(13, 0xc1)), null); // unknown type byte
  assert.equal(parseFrame(bytes(13, ...text('turn'), 0x83, 0xa1)), null); // data cut off
});
