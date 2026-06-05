import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

export default function BusinessSetupPage() {
  const { me, refresh } = useAuth();
  const { setSuccessMessage, setErrorMessage } = useToast();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<string[]>([]);
  const [localError, setLocalError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    category: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await api.businessCategories();
        setCategories(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setLocalError(getErrorMessage(err, '載入服務類別失敗'));
      }
    };
    void loadCategories();
  }, []);

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
    setLocalError('');
    setSaving(true);
    try {
      await api.setupBusiness(form);
      await refresh();
      setSuccessMessage('商家資訊建立成功');
      navigate('/business/info', { replace: true });
    } catch (err) {
      const message = getErrorMessage(err, '商家資訊建立失敗');
      setLocalError(message);
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main>
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-gradient text-white text-white-strong p-4 text-center">
                <h4 className="mb-0 fw-bold"><i className="bi bi-shop me-2"></i>建立商家資訊</h4>
                <p className="mb-0 mt-2 opacity-75">完成設定後即可開始管理預約服務</p>
              </div>

              <div className="card-body p-4">
                {localError ? <div className="alert alert-danger shadow-sm mb-4">{localError}</div> : null}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="businessName" className="form-label">商家名稱</label>
                    <input type="text" className="form-control" id="businessName" name="businessName" value={form.businessName} onChange={handleChange} required />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="category" className="form-label">服務類別</label>
                      <select className="form-select" id="category" name="category" value={form.category} onChange={handleChange} required>
                        <option value="" disabled>請選擇</option>
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
                    <button type="submit" className="btn btn-gradient btn-lg fw-bold shadow-sm" disabled={saving}>
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
