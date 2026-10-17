// A "content script": Firefox runs this file inside every wordbomb.io page.
// For now it only proves the extension is loaded, by printing one line to the page's console.
console.log('[defuser] hello! content script is running on', location.href);
