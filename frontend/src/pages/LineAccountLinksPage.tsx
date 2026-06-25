import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../state/ToastContext';

interface LinkedBusiness {
  lineCustomerId: number;
  businessId: number;
  businessName: string;
  linkedAt: string;
}

export default function LineAccountLinksPage() {
  const { setSuccessMessage, setErrorMessage } = useToast();
  const [items, setItems] = useState<LinkedBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const response = await api.linkedLineBusinesses();
      setItems(response.data || []);
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : '讀取 LINE 綁定失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const unlink = async (item: LinkedBusiness) => {
    if (!globalThis.confirm(`確定解除「${item.businessName}」的 LINE 帳號綁定？`)) return;
    try {
      await api.unlinkLineBusiness(item.lineCustomerId);
      setSuccessMessage('LINE 帳號綁定已解除');
      await load();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : '解除綁定失敗');
    }
  };

  return (
    <main className="container my-5">
      <h1 className="h3 mb-4">LINE 帳號綁定</h1>
      {loading ? <p>讀取中…</p> : null}
      {!loading && items.length === 0 ? <div className="alert alert-info">目前沒有已綁定的 LINE 商家。</div> : null}
      <div className="list-group">
        {items.map((item) => (
          <div key={item.lineCustomerId} className="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-bold">{item.businessName}</div>
              <small className="text-muted">
                綁定時間：{new Date(item.linkedAt).toLocaleString('zh-TW')}
              </small>
            </div>
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => void unlink(item)}>
              解除綁定
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
