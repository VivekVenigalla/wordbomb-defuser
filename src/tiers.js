// How common is a word? Two small methods for the data in tiers.txt.
//
//   loadTiers(text)          turns the contents of tiers.txt into a lookup table
//   getTier(tiers, word)     how common one word is: 0 = everyday ... 7 = rare, 8 = very rare
//
// Each line of tiers.txt looks like  "thing 0"  (the word, a space, its tier).
// Words that are not in the file are the rarest of all, so they get OBSCURE_TIER.

const OBSCURE_TIER = 8;

// A "Map" is a lookup table: give it a word, it gives back that word's tier.
function loadTiers(text) {
  const tiers = new Map();
  for (const line of text.split('\n')) {
    const parts = line.split(' ');
    if (parts.length !== 2) continue; // skip empty or damaged lines
    const tier = Number(parts[1]);
    if (!Number.isInteger(tier)) continue; // skip a line whose tier is not a whole number
    tiers.set(parts[0], tier);
  }
  return tiers;
}

function getTier(tiers, word) {
  return tiers.has(word) ? tiers.get(word) : OBSCURE_TIER;
}

if (typeof module !== 'undefined') module.exports = { loadTiers, getTier, OBSCURE_TIER };
