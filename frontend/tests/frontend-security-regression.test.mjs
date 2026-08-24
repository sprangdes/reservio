import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const frontendRoot = new URL('../', import.meta.url);
const source = (path) => readFileSync(new URL(path, frontendRoot), 'utf8');

test('production hosts deny framing of authenticated UI', () => {
  const nginx = source('nginx.conf');
  const vercel = JSON.parse(source('vercel.json'));

  assert.match(nginx, /Content-Security-Policy "frame-ancestors 'none'" always/);
  assert.match(nginx, /X-Frame-Options "DENY" always/);

  const catchAllHeaders = vercel.headers.find((entry) => entry.source === '/(.*)')?.headers ?? [];
  assert.deepEqual(
    Object.fromEntries(catchAllHeaders.map(({ key, value }) => [key, value])),
    {
      'Content-Security-Policy': "frame-ancestors 'none'",
      'X-Frame-Options': 'DENY'
    }
  );
});

test('production frontend image can create the nginx PID file as its non-root user', () => {
  const dockerfile = source('Dockerfile');

  assert.match(dockerfile, /chown -R nginx:nginx \/var\/cache\/nginx \/run \/etc\/nginx\/conf\.d/);
  assert.match(dockerfile, /USER nginx/);
});

test('automatic API responses cannot renew the inactivity deadline', () => {
  const api = source('src/api.ts');
  const navbar = source('src/components/Navbar.tsx');
  const timeout = source('src/components/SessionTimeoutManager.tsx');

  assert.doesNotMatch(api, /emitSessionActivity|SESSION_ACTIVITY_EVENT/);
  assert.match(navbar, /setInterval\(load, 10000\)/);
  assert.match(timeout, /\['pointerdown', 'keydown', 'wheel', 'focus'\]/);
  assert.match(timeout, /await api\.logout\(\)/);
  assert.match(timeout, /void expireIdleSession\(\)/);
  assert.match(timeout, /await api\.me\(\);\s*recordActivity\(\)/);
});
