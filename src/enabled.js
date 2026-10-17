// The extension's on/off switch. Two small methods used by both the toolbar button's script
// (background.js) and the page script (content.js).
//
//   isEnabledValue(saved)     is the extension ON, given the value that was saved?
//   describeEnabled(enabled)  the badge text and tooltip for the toolbar button

// The saved value is `true`, `false`, or missing (never saved yet). It is ON unless it is
// exactly `false`: if the saved value is missing or damaged, a working extension is the safer guess.
function isEnabledValue(saved) {
  return saved !== false;
}

// What the toolbar button should look like. `badge` is the little text drawn on top of the icon:
// nothing while ON, and "OFF" while OFF.
function describeEnabled(enabled) {
  return {
    badge: enabled ? '' : 'OFF',
    title: 'Word Bomb Defuser: ' + (enabled ? 'on' : 'off') + ' (click to turn ' + (enabled ? 'off' : 'on') + ')',
  };
}

if (typeof module !== 'undefined') module.exports = { isEnabledValue, describeEnabled };
