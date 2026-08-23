import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

function sourceFiles(directory = new URL('../src/', import.meta.url)) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const location = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) return sourceFiles(location);
    return entry.name.endsWith('.tsx') ? [readFileSync(location, 'utf8')] : [];
  });
}

test('toast host remains mounted across route changes', () => {
  const main = source('main.tsx');
  const layout = source('components/Layout.tsx');
  const businessWorkspace = source('features/business-operations/BusinessWorkspaceShell.tsx');
  const preferredBusinesses = source('pages/PreferredBusinessesPage.tsx');

  assert.match(main, /<ToastProvider>[\s\S]*<App \/>[\s\S]*<ToastContainer \/>[\s\S]*<\/ToastProvider>/);
  assert.doesNotMatch(layout, /ToastContainer/);
  assert.doesNotMatch(businessWorkspace, /ToastContainer/);
  assert.doesNotMatch(preferredBusinesses, /ToastContainer/);
});

test('application renders exactly one toast host', () => {
  const hosts = sourceFiles().flatMap((content) => content.match(/<ToastContainer\s*\/>/g) || []);
  assert.equal(hosts.length, 1);
});

test('toast messages are consumed after bootstrap finishes hiding them', () => {
  const toast = source('components/ToastContainer.tsx');

  assert.match(toast, /addEventListener\('hidden\.bs\.toast', clearMessage, \{ once: true \}\)/);
  assert.match(toast, /const clearMessage = \(\) => setSuccessMessage\(''\)/);
  assert.match(toast, /const clearMessage = \(\) => setErrorMessage\(''\)/);
});
