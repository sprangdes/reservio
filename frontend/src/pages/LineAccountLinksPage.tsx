import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../state/ToastContext';
import { normalizeLinkedLineBusinesses, type LinkedLineBusiness } from '../features/line/lineDomain';

export default function LineAccountLinksPage() {
  const { setErrorMessage } = useToast();
  const [items, setItems] = useState<LinkedLineBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const response = await api.linkedLineBusinesses();
      const normalized = normalizeLinkedLineBusinesses(response.data);
      if (!normalized) throw new Error('malformed data');
      setItems(normalized);
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : '讀取 LINE 綁定失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="container my-5">
      <h1 className="h3 mb-4">LINE 帳號綁定</h1>
      {loading ? <p>讀取中…</p> : null}
      {!loading && items.length === 0 ? <div className="alert alert-info">目前沒有已綁定的 LINE 商家。</div> : null}
      <div className="list-group">
        {items.map((item) => (
          <div key={item.unlinkId} className="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-bold">{item.businessName}</div>
              <small className="text-muted">
                綁定時間：{new Date(item.linkedAt).toLocaleString('zh-TW')}
              </small>
            </div>
            <button type="button" className="btn btn-outline-danger btn-sm" disabled title="解除綁定確認流程將在後續階段提供。">
              解除綁定
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
