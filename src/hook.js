// The hook: runs inside the web page itself (see "world": "MAIN" in manifest.json) so it can
// see the game's network traffic. It does ONE job: copy every binary message the game receives
// and hand it to our other script (content.js) to be understood.
//
// It never sends anything to the game. It only watches.
//
// How it sees the messages: when the game receives a message, the browser creates a
// "MessageEvent" and the game reads its `data` property. We replace that property with one that
// does the same thing but also takes a copy for us. This works for every connection the game
// opens, however it opens them.

(function () {
  // If this file somehow runs twice, do not install the hook twice.
  if (window.__defuserHooked) return;
  window.__defuserHooked = true;

  const alreadySeen = new WeakSet(); // events we have already copied (the game may read `data` several times)
  const original = Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'data');

  // Pass a message's bytes to content.js, along with the address of the connection it came
  // from (that address contains our own player id). `window.postMessage` is the browser's way
  // of sending a note between scripts on the same page.
  function passAlong(bytes, url) {
    window.postMessage({ source: 'defuser', bytes: bytes, url: url }, location.origin);
  }

  // Messages wait in this single line (a chain of "promises") and are passed along one at a time.
  // Why: reading a Blob takes a moment, so without the line a Blob could be overtaken by a later
  // message and we would process messages out of order, ending up with an outdated prompt.
  let line = Promise.resolve();

  function inspect(event, data) {
    if (!(event.target instanceof WebSocket)) return; // only messages from game connections
    if (alreadySeen.has(event)) return;
    alreadySeen.add(event);

    const isBinary = data instanceof ArrayBuffer || data instanceof Blob;
    if (!isBinary) return; // plain text messages are not game events

    const url = event.target.url; // read it now, while we are sure to have the event
    line = line
      .then(function () {
        return data instanceof Blob ? data.arrayBuffer() : data; // wait for the Blob's bytes if needed
      })
      .then(function (buffer) {
        passAlong(new Uint8Array(buffer), url);
      })
      .catch(function () {
        // If one message cannot be read, skip it, and keep the line moving for the next ones.
      });
  }

  Object.defineProperty(MessageEvent.prototype, 'data', {
    configurable: true,
    enumerable: original.enumerable,
    get: function () {
      const value = original.get.call(this); // do what the browser normally does
      try {
        inspect(this, value); // ...and also take a copy
      } catch (error) {
        // Whatever goes wrong here must never break the game.
      }
      return value;
    },
  });
})();
