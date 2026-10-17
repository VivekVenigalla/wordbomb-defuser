// Two small methods for working with the word list.
//
//   loadWords(text)            turns the contents of words.txt into a list of words
//   findWords(words, prompt)   returns every word that contains the prompt
//
// Example:  findWords(['apple', 'thing', 'nothing'], 'thi')  ->  ['thing', 'nothing']

// words.txt is one long piece of text with one word per line. Cut it into a list.
function loadWords(text) {
  return text.split('\n').filter((word) => word !== ''); // drop empty lines (like the one at the end)
}

// The prompt can appear anywhere inside the word: the start, the middle, or the end.
function findWords(words, prompt) {
  const wanted = prompt.toLowerCase(); // the game shows capitals ("THI"); our list is lowercase
  if (wanted === '') return []; // an empty prompt would match every word, which is never useful
  return words.filter((word) => word.includes(wanted));
}

if (typeof module !== 'undefined') module.exports = { loadWords, findWords };
