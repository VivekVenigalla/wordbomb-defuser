// Builds words.txt, the list of words the extension searches.
// Run it with:  npm run build:words
//
// It starts from the "word-list" package (a big list of English words, installed into
// node_modules by `npm install`), keeps only the words we can use, and saves them.

const fs = require('node:fs');
const path = require('node:path');

const source = path.join(__dirname, '..', 'node_modules', 'word-list', 'words.txt');
const output = path.join(__dirname, '..', 'words.txt');

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
