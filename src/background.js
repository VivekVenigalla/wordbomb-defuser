// The background script: it runs by itself in the browser (not inside any web page) and looks
// after the toolbar button. Clicking the button turns the extension on or off.
//
// It does not touch the page directly. It just saves the new on/off value in the extension's
// storage, and content.js (which is watching that value) reacts to the change.

async function readEnabled() {
  const saved = await browser.storage.local.get('enabled');
  return isEnabledValue(saved.enabled);
}

// Update the toolbar button: the "OFF" badge and the hover text.
async function drawButton(enabled) {
  const look = describeEnabled(enabled);
  await browser.action.setBadgeText({ text: look.badge });
  await browser.action.setBadgeBackgroundColor({ color: '#6b7280' });
  await browser.action.setTitle({ title: look.title });
}

browser.action.onClicked.addListener(async function () {
  const next = !(await readEnabled()); // flip it
  await browser.storage.local.set({ enabled: next });
  await drawButton(next);
});

// Make the button correct as soon as this script starts (for example when Firefox opens).
readEnabled().then(drawButton);
