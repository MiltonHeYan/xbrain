import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Palette-level regression checks, not a replacement for rendered-browser axe QA.
const css = readFileSync(new URL('../src/client/styles.css', import.meta.url), 'utf8');
const token = (name) => {
  const value = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{3,6})`, 'i'))?.[1];
  assert.ok(value, `Missing palette token ${name}`);
  return value;
};
function luminance(hex) {
  const h = hex.slice(1);
  const expanded = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const rgb = expanded.match(/../g).map((c) => parseInt(c, 16) / 255);
  const [r, g, b] = rgb.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
test('muted and body text tokens meet AA on every principal surface', () => {
  for (const text of ['ink', 'muted']) {
    for (const surface of ['bg', 'sidebar', 'card']) {
      assert.ok(contrast(token(text), token(surface)) >= 4.5, `${text} on ${surface}`);
    }
  }
});
test('primary action text and control boundaries meet contrast thresholds', () => {
  assert.ok(contrast('#fff', token('green')) >= 4.5);
  for (const surface of ['bg', 'sidebar', 'card']) {
    assert.ok(contrast(token('control-line'), token(surface)) >= 3, `control on ${surface}`);
  }
});
