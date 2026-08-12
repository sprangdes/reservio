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
    return <main className="customer-profile-page"><p className="customer-profile-page__state">讀取個人資料中…</p></main>;
  }
  if (me?.role !== 'ROLE_USER') {
    return <main className="customer-profile-page"><p className="customer-profile-page__state is-warning">只有客戶帳號可以修改個人資料。</p></main>;
  }

  return (
    <main className="customer-profile-page">
      <section className="customer-profile-page__content" aria-labelledby="profile-title">
          <header><p>帳號設定</p><h1 id="profile-title">修改我的資料</h1><span>更新你的顯示名稱與聯絡 Email。</span></header>
          {success ? <p className="customer-profile-page__message is-success">{success}</p> : null}
          {error ? <p className="customer-profile-page__message is-error">{error}</p> : null}
          {emailChanged ? (
            <p className="customer-profile-page__message is-info">Email 已變更，請重新驗證後再使用 Email 通知。</p>
          ) : null}
          <form className="customer-profile-page__form" onSubmit={(event) => void submit(event)}>
              <label htmlFor="profile-username">使用者名稱
              <input
                id="profile-username"
                name="username"
                className="form-control"
                value={username}
                maxLength={100}
                required
                onChange={(event) => setUsername(event.target.value)}
              />
              </label>
              <label htmlFor="profile-email">Email
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
              </label>
            <button type="submit" disabled={saving}>
              {saving ? '儲存中…' : '儲存變更'}
            </button>
          </form>
      </section>
    </main>
  );
}
