// Runs in the extension's own private area of the page. It receives the raw messages that
// hook.js copied, works out which event each one is, and prints it to the console.

console.log('[defuser] content script is running on', location.href);

window.addEventListener('message', function (message) {
  // The page can post messages too, so make sure this one is ours.
  if (message.origin !== location.origin) return;
  if (!message.data || message.data.source !== 'defuser') return;

  const event = parseFrame(message.data.bytes);
  if (event === null) return; // not a game event we understand

  console.log('[defuser] event:', event.name, event.data);
});
