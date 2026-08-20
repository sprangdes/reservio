import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const page = source('src/pages/LineAccountLinksPage.tsx');
const dialog = source('src/features/line/LineBusinessUnlinkDialog.tsx');
const domain = source('src/features/line/lineDomain.ts');
const css = source('src/styles.css');

test('Phase 5 renders a normalized linked-business list with loading, empty, error, and stale states', () => {
  assert.match(page, /normalizeLinkedLineBusinesses\(response\.data\)/);
  assert.match(page, /LineAccountLinksSkeleton/);
  assert.match(page, /目前尚未連結任何商家的 LINE 預約關聯。/);
  assert.match(page, /暫時無法取得 LINE 綁定資料，請稍後再試。/);
  assert.match(page, /目前顯示的是先前載入的資料，部分狀態可能尚未同步。/);
  assert.match(page, /解除綁定已送出，但目前無法確認最新清單。/);
  assert.match(page, /items\.map\(\(item\) => <LinkedBusinessRow key=\{item\.unlinkId\}/);
});

test('Phase 5 keeps internal association identifiers inside normalized action models', () => {
  assert.match(domain, /return businessName && linkedAt \? \{ businessName, linkedAt, unlinkId: value\.lineCustomerId \} : null/);
  assert.match(page, /mapLineBusinessUnlinkInput\(selected\)/);
  assert.doesNotMatch(page, /lineCustomerId/);
  assert.doesNotMatch(page, /businessId/);
  assert.doesNotMatch(page, /window\.confirm|window\.alert/);
});

test('Phase 5 unlink confirmation is accessible, inert, and pending-safe', () => {
  assert.match(page, /aria-label=\{`解除與 \$\{item\.businessName\} 的 LINE 綁定`\}/);
  assert.match(dialog, /role="alertdialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /useModalFocusTrap/);
  assert.match(dialog, /element\.inert = true/);
  assert.match(dialog, /event\.key === 'Escape' && !pending/);
  assert.match(dialog, /disabled=\{pending\}/);
  assert.match(dialog, /解除後，未來這個商家的 LINE 預約將不再關聯到目前 Reservio 帳號。已經轉移到帳號中的既有預約不會自動移回。/);
  assert.match(dialog, /此操作無法復原，解除後需由商家重新發起綁定。/);
});

test('Phase 5 calls DELETE once then authoritatively refetches without optimistic removal', () => {
  assert.match(page, /await api\.unlinkLineBusiness\(mapLineBusinessUnlinkInput\(selected\)\)/);
  assert.match(page, /const next = await fetchAuthoritativeList\(\)/);
  assert.match(page, /replaceItems\(next\)/);
  assert.match(page, /if \(!selected \|\| unlinkPending\) return/);
  assert.match(page, /setUnlinkError\('暫時無法解除 LINE 綁定，請稍後再試。'\)/);
  assert.match(page, /setStaleMessage\(unlinkRefreshError\)/);
  assert.doesNotMatch(page, /setItems\(.*filter/);
});

test('Phase 5 supports focused desktop dialog and mobile bottom-sheet geometry', () => {
  assert.match(css, /\.line-account-links__content/);
  assert.match(css, /\.line-account-links__dialog/);
  assert.match(css, /\.line-account-links__row > button/);
  assert.match(css, /@media \(max-width: 768px\).*line-account-links/s);
  assert.match(css, /\.line-account-links__confirmation \{ align-items: end/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /overflow-wrap: anywhere/);
});
