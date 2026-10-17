// Tests for src/tiers.js. Run them with:  npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadTiers, getTier, OBSCURE_TIER } = require('../src/tiers.js');
const { loadWords } = require('../src/find-words.js');

test('loadTiers: reads one "word tier" pair per line', () => {
  const tiers = loadTiers('thing 0\nsqueeze 1\naalii 7\n');
  assert.equal(tiers.get('thing'), 0);
  assert.equal(tiers.get('squeeze'), 1);
  assert.equal(tiers.get('aalii'), 7);
  assert.equal(tiers.size, 3);
});

test('loadTiers: the tier is a number, not text', () => {
  assert.strictEqual(loadTiers('cat 3').get('cat'), 3);
});

test('loadTiers: ignores empty lines and an empty file', () => {
  assert.equal(loadTiers('cat 1\n\ndog 2\n\n').size, 2);
  assert.equal(loadTiers('').size, 0);
});

test('loadTiers: ignores damaged lines but keeps the good ones', () => {
  const tiers = loadTiers('cat 1\njustaword\ndog x\nbird 2 extra\nfish 1.5\nant 4\n');
  assert.deepEqual([...tiers.keys()].sort(), ['ant', 'cat']);
});

test('getTier: returns the stored tier for a known word', () => {
  assert.equal(getTier(loadTiers('cat 2'), 'cat'), 2);
});

test('getTier: tier 0 is a real answer, not "missing"', () => {
  assert.equal(getTier(loadTiers('the 0'), 'the'), 0);
});

test('getTier: an unknown word is the rarest kind', () => {
  assert.equal(getTier(loadTiers('cat 2'), 'zyzzyva'), OBSCURE_TIER);
  assert.equal(OBSCURE_TIER, 8);
});

test('the real tiers.txt: everyday words are tier 0, obscure ones have no tier', () => {
  const tiers = loadTiers(fs.readFileSync(path.join(__dirname, '..', 'tiers.txt'), 'utf8'));
  assert.equal(getTier(tiers, 'the'), 0);
  assert.equal(getTier(tiers, 'thing'), 0);
  assert.equal(getTier(tiers, 'think'), 0);
  assert.equal(getTier(tiers, 'acanthin'), OBSCURE_TIER);
  assert.equal(getTier(tiers, 'phenylthiocarbamide'), OBSCURE_TIER);
});

test('the real tiers.txt: every tier is between 0 and 7', () => {
  const tiers = loadTiers(fs.readFileSync(path.join(__dirname, '..', 'tiers.txt'), 'utf8'));
  assert.ok(tiers.size > 100000);
  for (const tier of tiers.values()) assert.ok(tier >= 0 && tier < OBSCURE_TIER);
});

test('the real tiers.txt: every word in it is also in words.txt', () => {
  const tiers = loadTiers(fs.readFileSync(path.join(__dirname, '..', 'tiers.txt'), 'utf8'));
  const words = new Set(loadWords(fs.readFileSync(path.join(__dirname, '..', 'words.txt'), 'utf8')));
  for (const word of tiers.keys()) assert.ok(words.has(word), word + ' is in tiers.txt but not in words.txt');
});
