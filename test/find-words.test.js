// Tests for src/find-words.js. Run them with:  npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadWords, findWords } = require('../src/find-words.js');

test('loadWords: one word per line becomes a list', () => {
  assert.deepEqual(loadWords('apple\nbanana\ncherry\n'), ['apple', 'banana', 'cherry']);
});

test('loadWords: ignores empty lines', () => {
  assert.deepEqual(loadWords('apple\n\nbanana\n\n'), ['apple', 'banana']);
  assert.deepEqual(loadWords(''), []);
});

test('findWords: finds the prompt at the start, middle and end of words', () => {
  const words = ['think', 'nothing', 'sloth', 'banana'];
  assert.deepEqual(findWords(words, 'th'), ['think', 'nothing', 'sloth']);
});

test('findWords: returns an empty list when nothing matches', () => {
  assert.deepEqual(findWords(['apple', 'banana'], 'zzz'), []);
  assert.deepEqual(findWords([], 'th'), []);
});

test('findWords: capital letters in the prompt are fine', () => {
  assert.deepEqual(findWords(['thing', 'apple'], 'THI'), ['thing']);
});

test('findWords: an empty prompt finds nothing', () => {
  assert.deepEqual(findWords(['apple', 'banana'], ''), []);
});

test('findWords: keeps the original order and does not repeat a word', () => {
  // "anana" appears twice inside banana, but banana should be listed once
  assert.deepEqual(findWords(['zebra', 'banana', 'ana'], 'an'), ['banana', 'ana']);
});

test('findWords: the prompt must match as one piece, not as scattered letters', () => {
  // "tn" has a t and an n, but never "tn" next to each other
  assert.deepEqual(findWords(['tin', 'nut'], 'tn'), []);
});

test('the real word list: searching for "thi" finds the obvious words', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'words.txt'), 'utf8');
  const words = loadWords(text);
  const found = findWords(words, 'thi');
  assert.ok(found.includes('thing'));
  assert.ok(found.includes('nothing'));
  assert.ok(found.includes('think'));
  assert.ok(found.every((word) => word.includes('thi'))); // nothing wrong sneaked in
  assert.ok(words.length > 200000);
});

test('the real word list: a search takes only a few milliseconds', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'words.txt'), 'utf8');
  const words = loadWords(text);
  findWords(words, 'ing'); // one warm-up run, so we do not time the computer "waking up"
  const start = performance.now();
  for (let i = 0; i < 10; i++) findWords(words, 'ing'); // "ing" is a very common prompt
  const perSearch = (performance.now() - start) / 10;
  assert.ok(perSearch < 50, 'one search took ' + perSearch.toFixed(1) + 'ms');
});
