# Word Bomb Defuser

A small Firefox extension for [wordbomb.io](https://wordbomb.io). When it is your turn it shows a
box with the current prompt (the 2-3 letters that must appear in your word), the alphabet-bonus
letters you still need, and five suggested words (each marked with the needed letters it fills). A slider sets the minimum word length.

It only shows suggestions. It never types or sends anything for you.

## Try it in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...** and choose `manifest.json` from this folder.
3. Open (or refresh) a wordbomb.io tab. A box appears in the top-left corner.
4. Press **Alt+B** to hide the box, and again to bring it back. (Firefox remembers the choice.)

A temporary add-on disappears when Firefox quits. After changing any file, press **Reload** on
the add-on's card and refresh the game tab.

## Run the tests

    npm test

(Needs Node.js. The two dependencies, `word-list` and `wordlist-english`, are only used to build the data files.)

To rebuild `words.txt` and `tiers.txt`: `npm install` and then `npm run build:words`.

## How it works

The game is drawn on a canvas, so there is no text on the page to read. Instead the extension
listens to the game's network connection.

    game server -> hook.js -> content.js -> overlay on screen
                  (page)     (extension)

| File | What it does |
| --- | --- |
| `src/hook.js` | Runs inside the page. Copies each binary message the game receives, in order, and passes it on. Never sends anything. |
| `src/decode.js` | `decode`: turns the game's compact binary format (MessagePack) into JavaScript values. |
| `src/parse-frame.js` | `parseFrame`: finds the event name and its data inside one message. |
| `src/game-state.js` | Remembers the current prompt, whose turn it is, and which alphabet-bonus letters are still needed. Learns your player id from the connection address. |
| `src/find-words.js` | `loadWords`, `findWords`: every word that contains the prompt. |
| `src/tiers.js` | `loadTiers`, `getTier`: how common a word is (from `tiers.txt`), 0 = everyday ... 8 = very rare. |
| `src/rank-words.js` | `neededLettersIn` (which needed letters a word fills), `rankWords`: scores words (still-needed letters add points; rarer words and too-long words lose points) and keeps the best few. |
| `src/suggest.js` | `getSuggestions`: decides which words to show right now. |
| `src/overlay.js` | `makeOverlayText` (the text to show), `cleanMinLength` (checks the saved slider value), `isToggleShortcut` (is this the Alt+B key press?), `initOverlay`, `showOverlay` and `setOverlayVisible` (drawing the box). |
| `src/content.js` | Connects the pieces above. |
| `scripts/build-words.js` | Builds `words.txt` (from the `word-list` package) and `tiers.txt` (from `wordlist-english`). |
| `helpers/bytes.js` | Small helpers shared by the tests. |
| `test/` | One test file per source file. |

`manifest.json` tells Firefox which files to load, and in what order. The order matters: a file
must come after the files it uses.

## Known limits

- Words missing from `tiers.txt` count as the rarest kind. At very long minimum lengths the
  suggestions can still be unusual words, because few common words are that long.
- The alphabet-bonus rule is an assumption too: a letter whose number in the game's `user-letter-healths` event is above 0 counts as still needed.
- The player-id assumption (it is in the connection address) is unverified; if the box says
  "Turn unknown", that is why.
