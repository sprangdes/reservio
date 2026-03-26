import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../state/ToastContext.jsx';

export default function RegisterPage() {
  const { setErrorMessage } = useToast();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    isBusiness: false
  });
  const [localError, setLocalError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');

    if (form.password !== form.confirmPassword) {
      setPasswordError('兩次輸入的密碼不一致');
      return;
    }

    if (form.isBusiness) {
      sessionStorage.setItem('businessRegisterDraft', JSON.stringify({
        username: form.username,
        email: form.email,
        password: form.password
      }));
      navigate('/register-business');
      return;
    }

    try {
      await api.register({ username: form.username, email: form.email, password: form.password });
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
          <div className="col-md-6">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-gradient text-white text-white-strong p-4 text-center">
                <h4 className="mb-0 fw-bold">建立您的使用者帳號</h4>
                <p className="mb-0 mt-2 opacity-75">加入 Reservio，開始您的智慧預約體驗</p>
              </div>
              <div className="card-body p-4">
                {localError ? <div className="alert alert-danger shadow-sm mb-4">{localError}</div> : null}
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">使用者名稱</label>
                    <input
                      type="text"
                      className="form-control"
                      id="username"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      placeholder="請輸入您的名稱"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">電子郵件</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="example@mail.com"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">密碼</label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="請設定您的密碼"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="confirmPassword" className="form-label">確認密碼</label>
                    <input
                      type="password"
                      className={`form-control ${passwordError ? 'is-invalid' : ''}`}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={(event) => {
                        handleChange(event);
                        setPasswordError('');
                      }}
                      placeholder="請再次輸入密碼"
                      required
                    />
                    {passwordError ? (
                      <div id="passwordError" className="text-danger small mt-1">
                        <i className="bi bi-exclamation-circle"></i> {passwordError}
                      </div>
                    ) : null}
                  </div>
                  <div className="mb-3 form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="isBusiness"
                      name="isBusiness"
                      checked={form.isBusiness}
                      onChange={handleChange}
                    />
                    <label className="form-check-label" htmlFor="isBusiness">我要成為商家 </label>
                  </div>
                  <div className="d-grid mt-4">
                    <button type="submit" className="btn btn-gradient btn-lg fw-bold shadow-sm">確認註冊</button>
                  </div>
                </form>
              </div>
              <div className="card-footer text-center py-3">
                <small className="text-muted">已經有帳號了？ <Link to="/login" className="text-primary text-decoration-none fw-bold">立即登入</Link></small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
