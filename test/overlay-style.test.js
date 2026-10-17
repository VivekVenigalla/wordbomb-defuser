// Tests for src/overlay-style.js. Run them with:  npm test
// A style table has no logic to test, but it is easy to break by accident, so we check its shape.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { OVERLAY_STYLE, site } = require('../src/overlay-style.js');

// Every "rules" object in the table, with a name for error messages.
function allRuleSets() {
  const sets = [];
  for (const [name, value] of Object.entries(OVERLAY_STYLE)) {
    if (name === 'pill') for (const [kind, rules] of Object.entries(value)) sets.push(['pill.' + kind, rules]);
    else sets.push([name, value]);
  }
  return sets;
}

test('site() builds a CSS variable lookup with a fallback', () => {
  assert.equal(site('text-primary', '#eef0f8'), 'var(--text-primary, #eef0f8)');
});

test('every use of a site variable has a fallback (so it still looks right if the site changes)', () => {
  for (const [name, rules] of allRuleSets()) {
    for (const [property, value] of Object.entries(rules)) {
      // a "var(--something)" with no comma inside it has no fallback
      assert.ok(!/var\(--[a-z0-9-]+\)/.test(value), name + '.' + property + ' has a variable without a fallback');
    }
  }
});

test('the card is fixed in place, above the game, and lets clicks through', () => {
  assert.equal(OVERLAY_STYLE.card.position, 'fixed');
  assert.equal(OVERLAY_STYLE.card.pointerEvents, 'none');
  assert.ok(Number(OVERLAY_STYLE.card.zIndex) > 1000000);
});

test('only the slider area accepts clicks', () => {
  assert.equal(OVERLAY_STYLE.controls.pointerEvents, 'auto');
  for (const [name, rules] of allRuleSets()) {
    if (name !== 'controls' && name !== 'card') assert.equal(rules.pointerEvents, undefined, name);
  }
});

test('the box sits below the site header, so it does not cover the menu or coin counters', () => {
  assert.ok(parseInt(OVERLAY_STYLE.card.top, 10) >= 56);
});

test('the prompt and the suggested words are big', () => {
  assert.ok(parseInt(OVERLAY_STYLE.prompt.fontSize, 10) >= 32);
  assert.ok(parseInt(OVERLAY_STYLE.word.fontSize, 10) >= 22);
  // and bigger than the small labels around them
  assert.ok(parseInt(OVERLAY_STYLE.word.fontSize, 10) > parseInt(OVERLAY_STYLE.controlsRow.fontSize, 10) * 1.5);
});

test('there is a look for every situation the turn label can be in', () => {
  assert.deepEqual(Object.keys(OVERLAY_STYLE.pill).sort(), ['theirs', 'unknown', 'waiting', 'yours']);
});

test('every property name is written the JavaScript way (camelCase, no dashes)', () => {
  for (const [name, rules] of allRuleSets()) {
    for (const property of Object.keys(rules)) assert.ok(!property.includes('-'), name + ': ' + property);
  }
});
