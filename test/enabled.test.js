// Tests for src/enabled.js. Run them with:  npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isEnabledValue, describeEnabled } = require('../src/enabled.js');

test('isEnabledValue: true means on, false means off', () => {
  assert.equal(isEnabledValue(true), true);
  assert.equal(isEnabledValue(false), false);
});

test('isEnabledValue: nothing saved yet means on (the extension works out of the box)', () => {
  assert.equal(isEnabledValue(undefined), true);
  assert.equal(isEnabledValue(null), true);
});

test('isEnabledValue: damaged values do not switch it off by accident', () => {
  assert.equal(isEnabledValue('false'), true);
  assert.equal(isEnabledValue(0), true);
  assert.equal(isEnabledValue(''), true);
  assert.equal(isEnabledValue({}), true);
});

test('describeEnabled: when on there is no badge and the tooltip says it is on', () => {
  const look = describeEnabled(true);
  assert.equal(look.badge, '');
  assert.ok(look.title.includes('on'));
  assert.ok(look.title.includes('click to turn off'));
});

test('describeEnabled: when off the badge says OFF and the tooltip says it is off', () => {
  const look = describeEnabled(false);
  assert.equal(look.badge, 'OFF');
  assert.ok(look.title.includes('off ('));
  assert.ok(look.title.includes('click to turn on'));
});
