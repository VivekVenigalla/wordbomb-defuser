// Tests for src/rank-words.js. Run them with:  npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { scoreWord, rankWords } = require('../src/rank-words.js');
const { loadWords, findWords } = require('../src/find-words.js');

test('scoreWord: using a needed letter raises the score', () => {
  const withLetter = scoreWord('quiz', { neededLetters: 'z' });
  const without = scoreWord('quit', { neededLetters: 'z' });
  assert.ok(withLetter > without);
});

test('scoreWord: a repeated needed letter is only counted once', () => {
  // "aaa" and "abc" are both 3 letters long and both contain the needed letter "a"
  assert.equal(scoreWord('aaa', { neededLetters: 'a' }), scoreWord('abc', { neededLetters: 'a' }));
  // ...and the bonus is exactly 10 points: "bbb" has no "a" at all
  assert.equal(scoreWord('aaa', { neededLetters: 'a' }) - scoreWord('bbb', { neededLetters: 'a' }), 10);
});

test('scoreWord: more needed letters beat fewer', () => {
  assert.ok(scoreWord('jazz', { neededLetters: 'jz' }) > scoreWord('jaws', { neededLetters: 'jz' }));
});

test('scoreWord: a word longer than maxLength is marked down hard', () => {
  const fits = scoreWord('thing', { maxLength: 5 });
  const tooLong = scoreWord('thinking', { maxLength: 5 });
  assert.ok(fits > tooLong);
  assert.equal(fits - tooLong, 3 * 25 + 3 * 0.5); // 3 extra letters, and 3 more letters in total
});

test('scoreWord: with nothing special, shorter words score higher', () => {
  assert.ok(scoreWord('cat') > scoreWord('catalog'));
});

test('rankWords: best word comes first', () => {
  const ranked = rankWords(['think', 'thinking', 'thick'], { neededLetters: 'g', maxLength: 10 });
  assert.equal(ranked[0], 'thinking'); // the only one with a "g"
});

test('rankWords: respects the limit (default 5)', () => {
  const words = ['aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag'];
  assert.equal(rankWords(words).length, 5);
  assert.equal(rankWords(words, { limit: 2 }).length, 2);
  assert.equal(rankWords(words, { limit: 100 }).length, 7); // cannot return more than we have
});

test('rankWords: shorter words come first when nothing else differs', () => {
  assert.deepEqual(rankWords(['pear', 'fig', 'apple', 'date']), ['fig', 'date', 'pear', 'apple']);
});

test('rankWords: equal scores are put in alphabetical order', () => {
  assert.deepEqual(rankWords(['pear', 'date', 'bear']), ['bear', 'date', 'pear']);
});

test('rankWords: gives the same answer whatever order the input is in', () => {
  const a = rankWords(['dog', 'cat', 'ant']);
  const b = rankWords(['ant', 'cat', 'dog']);
  assert.deepEqual(a, b);
});

test('rankWords: does not change the list you give it', () => {
  const words = ['zebra', 'ant', 'mouse'];
  rankWords(words);
  assert.deepEqual(words, ['zebra', 'ant', 'mouse']);
});

test('rankWords: an empty list gives an empty list', () => {
  assert.deepEqual(rankWords([]), []);
});

test('real word list: ranking the matches for "thi"', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'words.txt'), 'utf8');
  const matches = findWords(loadWords(text), 'thi');
  const best = rankWords(matches, { neededLetters: 'xzq', maxLength: 9, limit: 5 });
  assert.equal(best.length, 5);
  assert.ok(best.every((word) => word.includes('thi')));
  assert.ok(best.every((word) => word.length <= 9)); // nothing too long when short ones exist
});

test('real word list: ranking the biggest result list is still fast', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'words.txt'), 'utf8');
  const matches = findWords(loadWords(text), 'ing'); // about 25,000 words
  rankWords(matches); // warm-up
  const start = performance.now();
  for (let i = 0; i < 5; i++) rankWords(matches, { neededLetters: 'xzq' });
  const perRank = (performance.now() - start) / 5;
  assert.ok(perRank < 200, 'one ranking took ' + perRank.toFixed(1) + 'ms');
});
