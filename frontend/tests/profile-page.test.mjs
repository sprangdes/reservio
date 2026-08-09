import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = (path) => readFileSync(resolve(root, path), 'utf8');

test('customer profile page edits username and email then refreshes auth', () => {
  const profilePath = resolve(root, 'src/pages/ProfilePage.tsx');
  assert.equal(existsSync(profilePath), true, 'ProfilePage.tsx must exist');
  const profile = readFileSync(profilePath, 'utf8');
  assert.match(profile, /api\.updateProfile/);
  assert.match(profile, /name="username"/);
  assert.match(profile, /name="email"/);
  assert.match(profile, /await refresh\(\)/);
  assert.match(profile, /重新驗證/);
});

test('profile route and update API are registered', () => {
  const app = source('src/App.tsx');
  assert.match(app, /path="\/profile"/);
  assert.match(app, /encodeURIComponent\(`\$\{location\.pathname}/);
  assert.match(app, /\/login\?returnTo=\$\{returnTo}/);
  assert.match(source('src/api.ts'), /updateProfile:[\s\S]*\/api\/me\/profile/);
});

test('account linking requires a LINE-linked customer session', () => {
  const page = source('src/pages/LineAccountLinkPage.tsx');
  assert.match(page, /me\.lineLoginSession/);
  assert.match(page, /\/api\/auth\/line\/user/);
  assert.match(page, /sessionStorage\.setItem\('reservio\.returnTo', currentReturnTo\)/);
  assert.match(page, /使用 LINE 登入並繼續/);
});
