// The overlay: a plain box on top of the game that shows the prompt and our suggested words.
//
//   makeOverlayText(info)   builds the text to show. (Pure: no browser needed, so it is tested.)
//   showOverlay(text)       puts that text in the box on the page, creating the box if needed.
//
// For makeOverlayText, `info` is  { prompt, count, myTurn, words }:
//   prompt   the letters, e.g. 'thi'  (empty string if no game is running)
//   count    how many words the game says fit the prompt
//   myTurn   true, false, or null when we do not know
//   words    the suggested words, best first

function makeOverlayText(info) {
  const lines = ['Word Bomb Defuser'];

  if (info.prompt === '') {
    lines.push('Waiting for a game...');
    return lines.join('\n');
  }

  lines.push('Prompt: ' + info.prompt.toUpperCase() + ' (' + info.count + ' words)');

  if (info.myTurn === false) {
    lines.push('Not your turn');
    return lines.join('\n'); // no suggestions until it is our turn
  }

  lines.push(info.myTurn === true ? 'Your turn' : 'Turn unknown (showing words anyway)');

  if (info.words.length === 0) {
    lines.push('No words found');
  } else {
    info.words.forEach((word, index) => lines.push(index + 1 + '. ' + word));
  }
  return lines.join('\n');
}

function showOverlay(text) {
  let box = document.getElementById('defuser-overlay');

  if (box === null) {
    box = document.createElement('div');
    box.id = 'defuser-overlay';
    box.style.cssText = [
      'position: fixed', // stay in place, on top of the page
      'top: 10px',
      'left: 10px',
      'z-index: 2147483647', // the biggest layer number: above everything else
      'background: white',
      'color: black',
      'border: 2px solid black',
      'padding: 8px',
      'font: 14px monospace',
      'white-space: pre', // keep our line breaks
      'pointer-events: none', // clicks pass through, so the box never blocks the game
    ].join('; ');
    document.documentElement.appendChild(box);
  }

  box.textContent = text;
}

if (typeof module !== 'undefined') module.exports = { makeOverlayText, showOverlay };
