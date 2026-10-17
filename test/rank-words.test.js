// Tests for src/rank-words.js. Run them with:  npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { scoreWord, rankWords, neededLettersIn, PENALTY_PER_TIER } = require('../src/rank-words.js');
const { loadTiers } = require('../src/tiers.js');
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

test('rankWords: minLength leaves out words that are too short', () => {
  const ranked = rankWords(['cat', 'catalog', 'cats', 'category'], { minLength: 5, limit: 10 });
  assert.deepEqual(ranked.sort(), ['catalog', 'category']);
});

test('rankWords: a word exactly as long as minLength is kept', () => {
  assert.deepEqual(rankWords(['abc', 'abcd'], { minLength: 4 }), ['abcd']);
  assert.deepEqual(rankWords(['abc', 'abcd'], { minLength: 3 }), ['abc', 'abcd']);
});

test('rankWords: minLength removes a short word even if it has a needed letter', () => {
  const ranked = rankWords(['zip', 'plain'], { minLength: 5, neededLetters: 'z' });
  assert.deepEqual(ranked, ['plain']);
});

test('rankWords: if nothing is long enough the result is empty', () => {
  assert.deepEqual(rankWords(['a', 'bb', 'ccc'], { minLength: 10 }), []);
});

test('rankWords: without minLength nothing is left out', () => {
  assert.deepEqual(rankWords(['a', 'bb'], { limit: 10 }), ['a', 'bb']);
});

test('scoreWord: a more common word scores higher than a rarer one of the same length', () => {
  const tiers = loadTiers('cat 0\ndog 5');
  assert.ok(scoreWord('cat', { tiers }) > scoreWord('dog', { tiers }));
});

test('scoreWord: each step down in commonness costs exactly PENALTY_PER_TIER points', () => {
  const tiers = loadTiers('aaa 1\nbbb 2\nccc 5');
  assert.equal(scoreWord('aaa', { tiers }) - scoreWord('bbb', { tiers }), PENALTY_PER_TIER);
  assert.equal(scoreWord('aaa', { tiers }) - scoreWord('ccc', { tiers }), 4 * PENALTY_PER_TIER);
});

test('scoreWord: a word missing from the tiers counts as the rarest (tier 8)', () => {
  const tiers = loadTiers('aaa 0');
  assert.equal(scoreWord('aaa', { tiers }) - scoreWord('zzz', { tiers }), 8 * PENALTY_PER_TIER);
});

test('scoreWord: without the tiers option the score ignores commonness', () => {
  assert.equal(scoreWord('cat'), -1.5); // 3 letters * 0.5, nothing else
});

test('rankWords: with tiers, a common word beats a rare word of the same length', () => {
  const tiers = loadTiers('this 0\nthig 7');
  assert.deepEqual(rankWords(['thig', 'this'], { tiers }), ['this', 'thig']);
});

test('rankWords: a much more common word can beat a shorter rare one', () => {
  // "think" (5 letters, tier 0) vs "thig" (4 letters, tier 7): the 7 steps outweigh 1 extra letter
  const tiers = loadTiers('think 0\nthig 7');
  assert.equal(rankWords(['thig', 'think'], { tiers })[0], 'think');
});

test('rankWords: needed letters can still beat commonness, if there are enough of them', () => {
  const tiers = loadTiers('plain 0\nquartz 2');
  // "quartz" is 2 tiers rarer (-6) but has the needed letters q and z (+20)
  assert.equal(rankWords(['plain', 'quartz'], { tiers, neededLetters: 'qz' })[0], 'quartz');
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

test('neededLettersIn: lists the needed letters a word contains, alphabetically', () => {
  assert.equal(neededLettersIn('anything', 'gkwy'), 'gy');
  assert.equal(neededLettersIn('thinking', 'zgk'), 'gk');
});

test('neededLettersIn: each letter is listed once, even if the word repeats it', () => {
  assert.equal(neededLettersIn('banana', 'a'), 'a');
  assert.equal(neededLettersIn('zizzy', 'zy'), 'yz');
});

test('neededLettersIn: nothing when the word has none of them, or none are needed', () => {
  assert.equal(neededLettersIn('this', 'xqz'), '');
  assert.equal(neededLettersIn('this', ''), '');
  assert.equal(neededLettersIn('this', undefined), '');
});

test('neededLettersIn: the count matches what scoreWord rewards', () => {
  for (const word of ['anything', 'banana', 'quizzing', 'this']) {
    const needed = 'gkwyqzan';
    const bonus = scoreWord(word, { neededLetters: needed }) - scoreWord(word);
    assert.equal(bonus, neededLettersIn(word, needed).length * 10);
  }
});
