import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { LineBusinessUnlinkDialog } from '../features/line/LineBusinessUnlinkDialog';
import { mapLineBusinessUnlinkInput, normalizeLinkedLineBusinesses, type LinkedLineBusiness } from '../features/line/lineDomain';
import { useToast } from '../state/ToastContext';

type LoadPhase = 'loading' | 'ready' | 'error';

const initialLoadError = '暫時無法取得 LINE 綁定資料，請稍後再試。';
const staleLoadError = '目前顯示的是先前載入的資料，部分狀態可能尚未同步。';
const unlinkRefreshError = '解除綁定已送出，但目前無法確認最新清單。';

function formatLinkedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '綁定日期暫時無法顯示'
    : new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function LineAccountLinksSkeleton() {
  return <section className="line-account-links__list line-account-links__skeleton" aria-busy="true" aria-label="正在載入 LINE 綁定資料">
    {[0, 1, 2].map((index) => <div className="line-account-links__skeleton-row" key={index}><span /><span /><span /></div>)}
  </section>;
}

function LinkedBusinessRow({ item, disabled, onUnlink }: Readonly<{ item: LinkedLineBusiness; disabled: boolean; onUnlink: (item: LinkedLineBusiness) => void }>) {
  const actionId = `line-unlink-${item.unlinkId}`;
  return <li className="line-account-links__row">
    <div className="line-account-links__business">
      <i className="bi bi-shop" aria-hidden="true" />
      <span><strong>{item.businessName}</strong><small>綁定於 {formatLinkedAt(item.linkedAt)}</small></span>
    </div>
    <button id={actionId} type="button" disabled={disabled} onClick={() => onUnlink(item)} aria-label={`解除與 ${item.businessName} 的 LINE 綁定`}>
      解除綁定
    </button>
  </li>;
}

export default function LineAccountLinksPage() {
  const { setSuccessMessage } = useToast();
  const [items, setItems] = useState<LinkedLineBusiness[]>([]);
  const itemsRef = useRef<LinkedLineBusiness[]>([]);
  const hasAuthoritativeListRef = useRef(false);
  const [phase, setPhase] = useState<LoadPhase>('loading');
  const [staleMessage, setStaleMessage] = useState('');
  const [selected, setSelected] = useState<LinkedLineBusiness | null>(null);
  const [unlinkPending, setUnlinkPending] = useState(false);
  const [unlinkError, setUnlinkError] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);

  const replaceItems = useCallback((next: LinkedLineBusiness[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const fetchAuthoritativeList = useCallback(async (): Promise<LinkedLineBusiness[]> => {
    const response = await api.linkedLineBusinesses();
    const normalized = normalizeLinkedLineBusinesses(response.data);
    if (!normalized) throw new Error('LINE_LINKED_BUSINESSES_MALFORMED');
    return normalized;
  }, []);

  const load = useCallback(async () => {
    const hasAuthoritativeList = hasAuthoritativeListRef.current;
    if (!hasAuthoritativeList) setPhase('loading');
    try {
      const next = await fetchAuthoritativeList();
      replaceItems(next);
      hasAuthoritativeListRef.current = true;
      setStaleMessage('');
      setPhase('ready');
    } catch {
      if (hasAuthoritativeList) {
        setStaleMessage(staleLoadError);
        setPhase('ready');
      } else {
        setPhase('error');
      }
    }
  }, [fetchAuthoritativeList, replaceItems]);

  useEffect(() => { void load(); }, [load]);

  const closeConfirmation = useCallback(() => {
    if (unlinkPending) return;
    setUnlinkError('');
    setSelected(null);
  }, [unlinkPending]);

  const unlink = useCallback(async () => {
    if (!selected || unlinkPending) return;
    setUnlinkPending(true);
    setUnlinkError('');
    const previousItems = itemsRef.current;
    try {
      await api.unlinkLineBusiness(mapLineBusinessUnlinkInput(selected));
      try {
        const next = await fetchAuthoritativeList();
        replaceItems(next);
        setStaleMessage('');
        setPhase('ready');
        setSelected(null);
        setSuccessMessage('已解除 LINE 綁定。');
        const removedIndex = previousItems.findIndex((item) => item.unlinkId === selected.unlinkId);
        const nextItem = next[Math.min(Math.max(removedIndex, 0), next.length - 1)];
        window.setTimeout(() => {
          const nextAction = nextItem ? document.getElementById(`line-unlink-${nextItem.unlinkId}`) : null;
          (nextAction instanceof HTMLElement ? nextAction : headingRef.current)?.focus();
        }, 0);
      } catch {
        setStaleMessage(unlinkRefreshError);
        setPhase('ready');
        setSelected(null);
      }
    } catch {
      setUnlinkError('暫時無法解除 LINE 綁定，請稍後再試。');
    } finally {
      setUnlinkPending(false);
    }
  }, [fetchAuthoritativeList, replaceItems, selected, setSuccessMessage, unlinkPending]);

  return <main className="line-account-links" aria-labelledby="line-account-links-title">
    <section className="line-account-links__content">
      <header className="line-account-links__header">
        <h1 id="line-account-links-title" ref={headingRef} tabIndex={-1}>LINE 帳號綁定</h1>
        <p>管理目前帳號已連結的商家 LINE 預約關聯。</p>
      </header>

      <aside className="line-account-links__notice" aria-label="綁定說明">
        <i className="bi bi-info-circle" aria-hidden="true" />
        <p>新的綁定需要從商家的 LINE 官方帳號或 Rich Menu 發起。</p>
      </aside>

      {staleMessage ? <section className="line-account-links__stale" role="status" aria-live="polite">
        <i className="bi bi-arrow-repeat" aria-hidden="true" /><p>{staleMessage}</p><button type="button" onClick={() => void load()}>重新載入</button>
      </section> : null}

      {phase === 'loading' ? <LineAccountLinksSkeleton /> : null}
      {phase === 'error' ? <section className="line-account-links__state" role="alert">
        <i className="bi bi-exclamation-circle" aria-hidden="true" /><h2>暫時無法取得 LINE 綁定資料，請稍後再試。</h2><button type="button" onClick={() => void load()}>重新載入</button>
      </section> : null}
      {phase === 'ready' && items.length === 0 ? <section className="line-account-links__state line-account-links__state--empty">
        <i className="bi bi-link-45deg" aria-hidden="true" /><h2>目前尚未連結任何商家的 LINE 預約關聯。</h2><p>新的綁定需要從商家的 LINE 官方帳號或 Rich Menu 發起。</p>
      </section> : null}
      {phase === 'ready' && items.length > 0 ? <ul className="line-account-links__list" aria-label="已連結的商家 LINE 預約關聯">
        {items.map((item) => <LinkedBusinessRow key={item.unlinkId} item={item} disabled={unlinkPending || Boolean(selected)} onUnlink={(next) => { setUnlinkError(''); setSelected(next); }} />)}
      </ul> : null}
    </section>
    {selected ? <LineBusinessUnlinkDialog item={selected} pending={unlinkPending} error={unlinkError} onCancel={closeConfirmation} onConfirm={() => void unlink()} /> : null}
  </main>;
}
