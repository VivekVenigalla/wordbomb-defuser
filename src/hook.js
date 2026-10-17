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

  function inspect(event, data) {
    if (!(event.target instanceof WebSocket)) return; // only messages from game connections
    if (alreadySeen.has(event)) return;
    alreadySeen.add(event);

    const url = event.target.url; // read it now: the Blob branch below runs later
    if (data instanceof ArrayBuffer) {
      passAlong(new Uint8Array(data), url);
    } else if (data instanceof Blob) {
      // Some connections deliver a "Blob"; reading its bytes takes a moment, so it is asynchronous.
      data.arrayBuffer().then(function (buffer) {
        passAlong(new Uint8Array(buffer), url);
      });
    }
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
