// getSuggestions: the decision of WHICH words to show right now.
//
//   getSuggestions(wordList, state, minLength, tiers)  ->  a list of up to 5 words (possibly empty)
//   (`tiers` says how common each word is, so everyday words are preferred. Optional.)
//
// It combines the pieces we built earlier: the game state (what is the prompt, whose turn is
// it), findWords (which words fit) and rankWords (which are best).

// Same trick as in parse-frame.js: in Node (the tests) load the other files ourselves; in the
// browser the manifest has already loaded them, so their functions exist.
const suggestParts =
  typeof require !== 'undefined'
    ? {
        isMyTurn: require('./game-state.js').isMyTurn,
        findWords: require('./find-words.js').findWords,
        rankWords: require('./rank-words.js').rankWords,
      }
    : { isMyTurn, findWords, rankWords };

const DEFAULT_MAX_LENGTH = 12; // longest word we think you can type in time
const SUGGESTION_COUNT = 5; // how many words to show

// (With no game running the prompt is '', and findWords returns nothing for an empty prompt.)
function getSuggestions(wordList, state, minLength, tiers) {
  if (suggestParts.isMyTurn(state) === false) return []; // someone else's turn

  const matches = suggestParts.findWords(wordList, state.prompt);
  return suggestParts.rankWords(matches, {
    minLength: minLength,
    maxLength: DEFAULT_MAX_LENGTH,
    tiers: tiers,
    limit: SUGGESTION_COUNT,
  });
}

if (typeof module !== 'undefined') {
  module.exports = { getSuggestions, DEFAULT_MAX_LENGTH, SUGGESTION_COUNT };
}
