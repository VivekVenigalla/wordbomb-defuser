// Two methods that pick the best words from a list of candidates.
//
//   scoreWord(word, options)   gives one word a score. Higher is better.
//   rankWords(words, options)  sorts words by score and returns the best few.
//
// The options (all optional):
//   maxLength       the longest word you can type in time. Longer words are marked down. (default 12)
//   neededLetters   letters you still need for the alphabet bonus, e.g. 'qxz'. (default none)
//   limit           how many words to return. (default 5)

const POINTS_PER_NEEDED_LETTER = 10; // each still-needed letter the word uses is worth this much
const PENALTY_PER_EXTRA_LETTER = 25; // each letter beyond maxLength costs this much
const PENALTY_PER_LETTER = 0.5; // a tiny cost for every letter, so shorter words win ties

function scoreWord(word, options = {}) {
  const maxLength = options.maxLength === undefined ? 12 : options.maxLength;
  const needed = new Set(options.neededLetters || ''); // a Set of the needed letters

  // Count how many DIFFERENT needed letters the word contains.
  // (new Set(word) keeps each letter once, so "aaa" counts "a" just one time.)
  let neededUsed = 0;
  for (const letter of new Set(word)) {
    if (needed.has(letter)) neededUsed += 1;
  }

  const extraLetters = Math.max(0, word.length - maxLength); // 0 if the word is short enough

  return (
    neededUsed * POINTS_PER_NEEDED_LETTER -
    extraLetters * PENALTY_PER_EXTRA_LETTER -
    word.length * PENALTY_PER_LETTER
  );
}

function rankWords(words, options = {}) {
  const limit = options.limit === undefined ? 5 : options.limit;

  // Pair each word with its score, so we only work out each score once.
  const scored = words.map((word) => ({ word: word, score: scoreWord(word, options) }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score; // higher score first
    return a.word < b.word ? -1 : 1; // same score: alphabetical, so the answer is always the same
  });

  return scored.slice(0, limit).map((item) => item.word);
}

if (typeof module !== 'undefined') module.exports = { scoreWord, rankWords };
