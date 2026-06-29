import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function declarations(source, selector) {
  const match = source.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `Missing CSS rule: ${selector}`);
  return match[1];
}

test('desktop reservation lists assign remaining card height to the table scrollport', () => {
  const body = declarations(css, '.reservation-card .card-body');
  const table = declarations(css, '.reservation-card .table-responsive');

  assert.match(body, /display:\s*flex/);
  assert.match(body, /flex-direction:\s*column/);
  assert.match(body, /flex:\s*1 1 auto/);
  assert.match(body, /min-height:\s*0/);
  assert.match(body, /overflow:\s*hidden/);

  assert.match(table, /flex:\s*1 1 auto/);
  assert.match(table, /min-height:\s*0/);
  assert.match(table, /overflow-y:\s*auto/);
  assert.doesNotMatch(table, /max-height:\s*calc\(/);
});

test('mobile reservation lists return to normal document flow', () => {
  const mobileCss = css.slice(css.lastIndexOf('@media (max-width: 768px)'));
  const body = declarations(mobileCss, '.reservation-card .card-body');
  const table = declarations(mobileCss, '.reservation-card .table-responsive');

  assert.match(body, /display:\s*block/);
  assert.match(body, /min-height:\s*auto/);
  assert.match(body, /overflow:\s*visible/);
  assert.match(table, /flex:\s*none/);
  assert.match(table, /min-height:\s*auto/);
  assert.match(table, /max-height:\s*none/);
});
