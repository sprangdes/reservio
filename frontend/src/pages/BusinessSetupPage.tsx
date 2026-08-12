import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';

function setupErrorMessage(error: unknown, action: 'load' | 'save'): string {
  if (error instanceof ApiError && error.status === 401) return '登入已逾時，請重新登入。';
  if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
    return action === 'save' ? '商家資料無法儲存，請確認欄位後再試。' : '暫時無法取得商家類別，請稍後再試。';
  }
  if (error instanceof TypeError) return '網路連線失敗，請確認連線後再試。';
  return action === 'save' ? '商家資訊建立失敗，請稍後再試。' : '載入商家類別失敗，請稍後再試。';
}

export default function BusinessSetupPage() {
  const { me, refresh } = useAuth();
  const { setSuccessMessage, setErrorMessage } = useToast();
  const navigate = useNavigate();
  const savingRef = useRef(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryState, setCategoryState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [localError, setLocalError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    category: '',
    phone: '',
    address: ''
  });

  const loadCategories = useCallback(async () => {
    setCategoryState('loading');
    setLocalError('');
    try {
      const res = await api.businessCategories();
      const next = Array.isArray(res.data) ? res.data.filter((item: unknown): item is string => typeof item === 'string' && Boolean(item.trim())) : [];
      setCategories(next);
      setCategoryState(next.length ? 'ready' : 'error');
      if (!next.length) setLocalError('目前沒有可用的商家類別，請稍後再試。');
    } catch (error) {
      setCategoryState('error');
      setLocalError(setupErrorMessage(error, 'load'));
    }
  }, []);

  useEffect(() => { void loadCategories(); }, [loadCategories]);

  if (me?.role !== 'ROLE_BUSINESS') {
    return <Navigate to="/" replace />;
  }

  if (me.business) {
    return <Navigate to="/business/info" replace />;
  }

  const handleChange = (event: { target: { name: string; value: string } }) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (savingRef.current || categoryState !== 'ready') return;
    savingRef.current = true;
    setLocalError('');
    setSaving(true);
    try {
      await api.setupBusiness(form);
      await refresh();
      setSuccessMessage('商家資訊建立成功');
      navigate('/business/info', { replace: true });
    } catch (error) {
      const message = setupErrorMessage(error, 'save');
      setLocalError(message);
      setErrorMessage(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <main className="business-setup-page">
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-gradient text-white text-white-strong p-4 text-center">
                <h1 className="h4 mb-0 fw-bold" tabIndex={-1}><i className="bi bi-shop me-2" aria-hidden="true"></i>建立商家資訊</h1>
                <p className="mb-0 mt-2 opacity-75">完成設定後即可開始管理預約服務</p>
              </div>

              <div className="card-body p-4">
                {localError ? <div className="alert alert-danger shadow-sm mb-4" role="alert">{localError}{categoryState === 'error' ? <button type="button" className="btn btn-link d-block p-0 mt-2" onClick={() => void loadCategories()}>重新載入商家類別</button> : null}</div> : null}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="businessName" className="form-label">商家名稱</label>
                    <input type="text" className="form-control" id="businessName" name="businessName" value={form.businessName} onChange={handleChange} required />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="category" className="form-label">服務類別</label>
                      <select className="form-select" id="category" name="category" value={form.category} onChange={handleChange} disabled={saving || categoryState !== 'ready'} required>
                        <option value="" disabled>{categoryState === 'loading' ? '載入商家類別中…' : '請選擇'}</option>
                        {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="phone" className="form-label">商家電話</label>
                      <input type="tel" className="form-control" id="phone" name="phone" value={form.phone} onChange={handleChange} required />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="address" className="form-label">商家地址</label>
                    <input type="text" className="form-control" id="address" name="address" value={form.address} onChange={handleChange} required />
                  </div>

                  <div className="d-grid mt-4">
                    <button type="submit" className="btn btn-gradient btn-lg fw-bold shadow-sm" disabled={saving || categoryState !== 'ready'}>
                      {saving ? '建立中...' : '完成設定並進入管理後台'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
