import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../state/ToastContext.jsx';

export default function RegisterBusinessPage() {
  const { setErrorMessage } = useToast();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    businessName: '',
    category: '',
    phone: '',
    address: ''
  });
  const [localError, setLocalError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await api.businessCategories();
        const items = Array.isArray(res.data) ? res.data : [];
        setCategories(items);
      } catch (err) {
        setLocalError(err.message || '載入服務類別失敗');
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const draft = sessionStorage.getItem('businessRegisterDraft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setForm((prev) => ({ ...prev, ...parsed }));
      } catch {
        // ignore
      }
    }
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');

    try {
      await api.registerBusiness(form);
      sessionStorage.removeItem('businessRegisterDraft');
      navigate('/login?registered=1');
    } catch (err) {
      setLocalError(err.message);
      setErrorMessage(err.message);
    }
  };

  return (
    <main>
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-gradient text-white text-white-strong p-4 text-center">
                <h4 className="mb-0 fw-bold"><i className="bi bi-shop me-2"></i>成為 Reservio 合作商家</h4>
                <p className="mb-0 mt-2 opacity-75">讓智慧預約助您的事業一臂之力</p>
              </div>

              <div className="card-body p-4">
                {localError ? (
                  <div className="alert alert-danger shadow-sm mb-4">
                    <i className="bi bi-exclamation-circle-fill me-2"></i>
                    {localError}
                  </div>
                ) : null}

                <form onSubmit={handleSubmit}>
                  <h5 className="fw-bold mb-3 border-bottom pb-2">管理員資訊</h5>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="username" className="form-label">名稱</label>
                      <input type="text" className="form-control" id="username" name="username" value={form.username} onChange={handleChange} placeholder="登入帳號" required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="email" className="form-label">電子郵件</label>
                      <input type="email" className="form-control" id="email" name="email" value={form.email} onChange={handleChange} placeholder="聯絡用 Email" required />
                    </div>
                  </div>

                  <h5 className="fw-bold mb-3 border-bottom pb-2">商家基本資料</h5>
                  <div className="mb-3">
                    <label htmlFor="businessName" className="form-label">商家名稱</label>
                    <input type="text" className="form-control" id="businessName" name="businessName" value={form.businessName} onChange={handleChange} placeholder="例如： Reservio 咖啡館" required />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="category" className="form-label">服務類別</label>
                      <select className="form-select" id="category" name="category" value={form.category} onChange={handleChange} required>
                        <option value="" disabled>請選擇</option>
                        {categories.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="phone" className="form-label">商家電話</label>
                      <input type="tel" className="form-control" id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="02-12345678" required />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="address" className="form-label">商家地址</label>
                    <input type="text" className="form-control" id="address" name="address" value={form.address} onChange={handleChange} placeholder="請輸入完整服務地址" required />
                  </div>

                  <div className="d-grid mt-4">
                    <button type="submit" className="btn btn-gradient btn-lg fw-bold shadow-sm">完成商家註冊並進入管理後台</button>
                  </div>
                </form>
              </div>

              <div className="card-footer text-center py-3">
                <small className="text-muted">想改以客戶身份註冊？ <Link to="/register" className="text-primary text-decoration-none fw-bold">返回一般註冊</Link></small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
