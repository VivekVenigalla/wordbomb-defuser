// Builds the two data files the extension uses.
// Run it with:  npm run build:words
//
//   words.txt   every word the extension may suggest, one per line
//   tiers.txt   how COMMON some of those words are, one "word tier" pair per line, e.g. "thing 0"
//               tier 0 = everyday words ... tier 7 = rare words. Words missing from this file
//               are even rarer than tier 7 (see OBSCURE_TIER in src/tiers.js).
//
// The words come from the "word-list" package, and the commonness from the "wordlist-english"
// package. Both are installed into node_modules by `npm install`.

const fs = require('node:fs');
const path = require('node:path');

const source = path.join(__dirname, '..', 'node_modules', 'word-list', 'words.txt');
const output = path.join(__dirname, '..', 'words.txt');
const tiersOutput = path.join(__dirname, '..', 'tiers.txt');

// wordlist-english has one list per commonness "level", from the most common words (10) to
// rarer ones (70). We number them 0, 1, 2... so that 0 is the most common.
const commonnessLists = require('wordlist-english');
const LEVELS = [10, 20, 35, 40, 50, 55, 60, 70];

const words = fs
  .readFileSync(source, 'utf8') // the whole file as one long piece of text
  .split('\n') // cut it into lines: one word per line
  .map((word) => word.trim().toLowerCase()) // remove stray spaces, make everything lowercase
  .filter((word) => /^[a-z]+$/.test(word)) // keep words made only of the letters a-z
  .filter((word) => word.length >= 2); // a prompt is at least 2 letters, so 1-letter words are useless

const unique = [...new Set(words)]; // a Set drops duplicates
unique.sort(); // alphabetical

fs.writeFileSync(output, unique.join('\n') + '\n'); // one word per line
console.log('Wrote ' + unique.length + ' words to words.txt');

// Work out each word's tier. A word can appear in more than one level's list; the most
// common level (the first one we meet) wins.
const tierOf = new Map();
LEVELS.forEach((level, tier) => {
  for (const word of commonnessLists['english/' + level]) {
    if (!tierOf.has(word)) tierOf.set(word, tier);
  }
});

// Only write tiers for words that are really in words.txt. (The commonness lists include
// capitalised words, accented words and so on, which we threw away above.)
const tierLines = unique.filter((word) => tierOf.has(word)).map((word) => word + ' ' + tierOf.get(word));
fs.writeFileSync(tiersOutput, tierLines.join('\n') + '\n');
console.log('Wrote ' + tierLines.length + ' word tiers to tiers.txt');
