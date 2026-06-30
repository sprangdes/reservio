import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../state/AuthContext';

export default function ProfilePage() {
  const { me, loading, refresh } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [emailChanged, setEmailChanged] = useState(false);

  useEffect(() => {
    setUsername(me?.username || '');
    setEmail(me?.email || '');
  }, [me?.username, me?.email]);

  const submit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    const changed = normalizedEmail !== (me?.email || '').toLowerCase();
    try {
      await api.updateProfile({
        username: username.trim(),
        email: normalizedEmail
      });
      await refresh();
      setEmailChanged(changed);
      setSuccess('個人資料已更新');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '個人資料更新失敗');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main className="container my-5">讀取個人資料中…</main>;
  }
  if (me?.role !== 'ROLE_USER') {
    return <main className="container my-5"><div className="alert alert-warning">只有客戶帳號可以修改個人資料。</div></main>;
  }

  return (
    <main className="container my-5">
      <div className="card shadow-sm border-0 mx-auto" style={{ maxWidth: 560 }}>
        <div className="card-body p-4">
          <h1 className="h3 mb-4">修改我的資料</h1>
          {success ? <div className="alert alert-success">{success}</div> : null}
          {error ? <div className="alert alert-danger">{error}</div> : null}
          {emailChanged ? (
            <div className="alert alert-info">Email 已變更，請重新驗證後再使用 Email 通知。</div>
          ) : null}
          <form onSubmit={(event) => void submit(event)}>
            <div className="mb-3">
              <label className="form-label" htmlFor="profile-username">使用者名稱</label>
              <input
                id="profile-username"
                name="username"
                className="form-control"
                value={username}
                maxLength={100}
                required
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="profile-email">Email</label>
              <input
                id="profile-email"
                name="email"
                type="email"
                className="form-control"
                value={email}
                maxLength={255}
                required
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-success" disabled={saving}>
              {saving ? '儲存中…' : '儲存變更'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
