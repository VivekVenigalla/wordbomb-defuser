// Two methods that pick the best words from a list of candidates.
//
//   scoreWord(word, options)   gives one word a score. Higher is better.
//   rankWords(words, options)  sorts words by score and returns the best few.
//
// The options (all optional):
//   minLength       words shorter than this are left out completely. (default 0: keep everything)
//   maxLength       the longest word you can type in time. Longer words are marked down. (default 12)
//   neededLetters   letters you still need for the alphabet bonus, e.g. 'qxz'. (default none)
//   tiers           how common each word is (the lookup table from loadTiers). Rarer words
//                   are marked down. (default: not used, so commonness is ignored)
//   limit           how many words to return. (default 5)

// In the browser, tiers.js has already been loaded by the manifest; in Node (the tests) we load it.
const rankParts = typeof require !== 'undefined' ? { getTier: require('./tiers.js').getTier } : { getTier };

const POINTS_PER_NEEDED_LETTER = 10; // each still-needed letter the word uses is worth this much
const PENALTY_PER_EXTRA_LETTER = 25; // each letter beyond maxLength costs this much
const PENALTY_PER_LETTER = 0.5; // a tiny cost for every letter, so shorter words win ties
const PENALTY_PER_TIER = 3; // each step down in commonness costs this much (tier 0 = free, 8 = 24 points)

// Which of the still-needed letters does this word contain? Returns them as text, each one
// once, in alphabetical order:  neededLettersIn('anything', 'gkwy')  ->  'gy'
// (The overlay uses this too, so what it shows always matches what the score counted.)
function neededLettersIn(word, neededLetters) {
  const needed = new Set(neededLetters || ''); // a Set of the needed letters
  const found = new Set(); // new Set(word) style: each letter is kept only once
  for (const letter of word) {
    if (needed.has(letter)) found.add(letter);
  }
  return [...found].sort().join('');
}

function scoreWord(word, options = {}) {
  const maxLength = options.maxLength === undefined ? 12 : options.maxLength;
  const neededUsed = neededLettersIn(word, options.neededLetters).length; // how many different ones

  const extraLetters = Math.max(0, word.length - maxLength); // 0 if the word is short enough

  // Without commonness data we cannot say a word is rare, so it costs nothing.
  const tier = options.tiers === undefined ? 0 : rankParts.getTier(options.tiers, word);

  return (
    neededUsed * POINTS_PER_NEEDED_LETTER -
    extraLetters * PENALTY_PER_EXTRA_LETTER -
    word.length * PENALTY_PER_LETTER -
    tier * PENALTY_PER_TIER
  );
}

function rankWords(words, options = {}) {
  const limit = options.limit === undefined ? 5 : options.limit;
  const minLength = options.minLength === undefined ? 0 : options.minLength;

  // Throw away words that are too short, before doing any scoring.
  const longEnough = words.filter((word) => word.length >= minLength);

  // Pair each word with its score, so we only work out each score once.
  const scored = longEnough.map((word) => ({ word: word, score: scoreWord(word, options) }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score; // higher score first
    return a.word < b.word ? -1 : 1; // same score: alphabetical, so the answer is always the same
  });

  return scored.slice(0, limit).map((item) => item.word);
}

if (typeof module !== 'undefined') module.exports = { scoreWord, rankWords, neededLettersIn, PENALTY_PER_TIER };
