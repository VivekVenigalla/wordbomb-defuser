// Tests for manifest.json: every file it points at must really exist, and the pieces Firefox
// needs must be there. (A missing file is one of the most common reasons an extension silently does nothing.)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const exists = (file) => fs.existsSync(path.join(root, file));

test('every script run on the page exists', () => {
  for (const entry of manifest.content_scripts) {
    for (const file of entry.js) assert.ok(exists(file), 'missing content script: ' + file);
  }
});

test('every background script exists', () => {
  assert.ok(manifest.background.scripts.length > 0);
  for (const file of manifest.background.scripts) assert.ok(exists(file), 'missing background script: ' + file);
});

test('the icons exist', () => {
  for (const file of Object.values(manifest.icons)) assert.ok(exists(file), 'missing icon: ' + file);
  assert.ok(exists(manifest.action.default_icon), 'missing toolbar icon');
});

test('the data files the page may fetch exist', () => {
  for (const entry of manifest.web_accessible_resources) {
    for (const file of entry.resources) assert.ok(exists(file), 'missing file: ' + file);
  }
});

test('the toolbar button and the permissions it needs are declared', () => {
  assert.ok(manifest.action, 'no "action" (toolbar button)');
  assert.ok(manifest.permissions.includes('storage'));
});

test('the page hook runs in the page, and nothing else does', () => {
  const inPage = manifest.content_scripts.filter((entry) => entry.world === 'MAIN');
  assert.equal(inPage.length, 1);
  assert.deepEqual(inPage[0].js, ['src/hook.js']);
});

test('scripts are listed after the scripts they depend on', () => {
  // Each pair is [file, a file it needs that must be loaded earlier].
  const needs = [
    ['src/parse-frame.js', 'src/decode.js'],
    ['src/rank-words.js', 'src/tiers.js'],
    ['src/suggest.js', 'src/game-state.js'],
    ['src/suggest.js', 'src/find-words.js'],
    ['src/suggest.js', 'src/rank-words.js'],
    ['src/overlay.js', 'src/rank-words.js'],
    ['src/overlay.js', 'src/overlay-style.js'],
    ['src/content.js', 'src/enabled.js'],
    ['src/content.js', 'src/overlay.js'],
    ['src/content.js', 'src/suggest.js'],
  ];
  const list = manifest.content_scripts.find((entry) => entry.world !== 'MAIN').js;
  for (const [file, dependency] of needs) {
    assert.ok(list.indexOf(dependency) !== -1, dependency + ' is not loaded at all');
    assert.ok(list.indexOf(dependency) < list.indexOf(file), dependency + ' must come before ' + file);
  }
  const bg = manifest.background.scripts;
  assert.ok(bg.indexOf('src/enabled.js') < bg.indexOf('src/background.js'));
});
