import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useToast } from '../state/ToastContext.jsx';
import { useServiceManagement } from '../hooks/useServiceManagement.js';

export default function ServiceManagementPage() {
  const { me } = useAuth();
  const { setSuccessMessage, setErrorMessage } = useToast();
  const [services, setServices] = useState([]);

  const load = async () => {
    const businessId = me?.business?.id;
    if (!businessId) {
      setServices([]);
      return;
    }
    const res = await api.businessServices(businessId);
    setServices(res.data || []);
  };

  useEffect(() => {
    void load();
  }, [me]);

  const {
    form,
    editingId,
    editForm,
    busyId,
    handleChange,
    handleSubmit,
    startEdit,
    cancelEdit,
    handleEditChange,
    handleSave,
    handleDelete,
    handleToggle
  } = useServiceManagement({ load, setSuccessMessage, setErrorMessage });

  const resolvedInterval = Number(me?.business?.slotInterval || 30) || 30;
  const buildDurationOptions = (interval, maxMinutes = 480) => {
    const safe = Number.isFinite(interval) && interval > 0 ? interval : 30;
    const values = [];
    for (let value = safe; value <= maxMinutes; value += safe) {
      values.push(value);
    }
    return values;
  };
  const durationOptions = buildDurationOptions(resolvedInterval);

  if (!me?.business) {
    return (
      <main className="container list-page">
        <div className="alert alert-warning">非商家帳號無法管理服務。</div>
      </main>
    );
  }

  return (
    <main className="container list-page">
      <div className="row g-4">
        <div className="col-md-4">
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-header bg-gradient text-white text-white-strong p-4 text-center">
              <h5 className="mb-0 fw-bold"><i className="bi bi-plus-lg me-2"></i>新增服務項目</h5>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label fw-bold small text-muted">服務名稱</label>
                  <input
                    type="text"
                    className="form-control border-light bg-light"
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="例如：精緻剪髮"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="duration" className="form-label fw-bold small text-muted">服務時長 (分鐘)</label>
                  <div className="input-group">
                    <select
                      className="form-select border-light bg-light"
                      id="duration"
                      name="duration"
                      value={form.duration}
                      onChange={handleChange}
                      required
                    >
                      <option value="">請選擇時長</option>
                      {!durationOptions.includes(Number(form.duration)) && form.duration ? (
                        <option value={form.duration}>{form.duration}</option>
                      ) : null}
                      {durationOptions.map((value) => (
                        <option key={value} value={String(value)}>{value}</option>
                      ))}
                    </select>
                    <span className="input-group-text border-light bg-light text-muted small">分鐘</span>
                  </div>
                </div>
                <div className="d-grid">
                  <button type="submit" className="btn btn-gradient fw-bold shadow-sm">確認新增</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card shadow-sm border-0 rounded-3 overflow-hidden reservation-card">
            <div className="card-header bg-gradient text-white text-white-strong p-4 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold"><i className="bi bi-list-ul me-2"></i>目前的服務項目</h5>
              <span className="badge bg-white bg-opacity-25 fs-6 fw-normal">
                <i className="bi bi-list-check me-1"></i> 共 {services.length} 筆
              </span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive desktop-table">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4 text-start" style={{ width: '45%' }}>服務名稱</th>
                      <th className="text-center" style={{ width: '20%' }}>預估時長</th>
                      <th className="text-center" style={{ width: '15%' }}>啟用</th>
                      <th className="text-center pe-4" style={{ width: '20%' }}>管理</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={s.id}>
                        <td className="ps-4 fw-bold text-dark">
                          {editingId === s.id ? (
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              name="name"
                              value={editForm.name}
                              onChange={handleEditChange}
                              required
                            />
                          ) : (
                            s.name
                          )}
                        </td>
                        <td className="text-center">
                          {editingId === s.id ? (
                            <div className="input-group input-group-sm">
                              <select
                                className="form-select"
                                name="duration"
                                value={editForm.duration}
                                onChange={handleEditChange}
                                required
                              >
                                {!durationOptions.includes(Number(editForm.duration)) && editForm.duration ? (
                                  <option value={editForm.duration}>{editForm.duration}</option>
                                ) : null}
                                {durationOptions.map((value) => (
                                  <option key={value} value={String(value)}>{value}</option>
                                ))}
                              </select>
                              <span className="input-group-text">分鐘</span>
                            </div>
                          ) : (
                            <span className="badge rounded-pill bg-light text-primary border border-primary border-opacity-25 px-3 py-2">
                              <i className="bi bi-stopwatch me-1"></i> {s.duration} 分鐘
                            </span>
                          )}
                        </td>
                        <td className="text-center">
                          <label className="switch" title={s.active ? '已啟用' : '已停用'}>
                            <input type="checkbox" checked={!!s.active} disabled={busyId === s.id} onChange={() => handleToggle(s)}/>
                            <span className="slider"></span>
                            <span className="visually-hidden">{s.active ? '停用服務項目' : '啟用服務項目'}</span>
                          </label>
                        </td>
                        <td className="text-center pe-4">
                          {editingId === s.id ? (
                            <div className="btn-group">
                              <button className="btn btn-sm btn-outline-success" onClick={() => handleSave(s.id)} disabled={busyId === s.id}>
                                <i className="bi bi-check-lg"></i> 儲存
                              </button>
                              <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit} disabled={busyId === s.id}>
                                取消
                              </button>
                            </div>
                          ) : (
                            <div className="btn-group">
                              <button className="btn btn-sm btn-link text-primary text-decoration-none" onClick={() => startEdit(s)} disabled={busyId === s.id}>
                                <i className="bi bi-pencil-square"></i> 編輯
                              </button>
                              <button className="btn btn-sm btn-link text-danger text-decoration-none" onClick={() => handleDelete(s.id)} disabled={busyId === s.id}>
                                <i className="bi bi-trash3"></i> 移除
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {services.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-5">
                          <i className="bi bi-journal-x display-4 d-block mb-3 opacity-25"></i>尚未設定任何服務項目，請從左側新增
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="mobile-list p-3">
                {services.map((s) => (
                  <div key={s.id} className="card mb-3 shadow-sm">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="fw-bold">{s.name}</div>
                        <span className="badge rounded-pill bg-light text-primary border border-primary border-opacity-25 px-3 py-2">
                          <i className="bi bi-stopwatch me-1"></i> {s.duration} 分鐘
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="text-muted small">啟用</span>
                        <label className="switch">
                          <input type="checkbox" checked={!!s.active} disabled={busyId === s.id} onChange={() => handleToggle(s)}/>
                          <span className="slider"></span>
                          <span className="visually-hidden">{s.active ? '停用服務項目' : '啟用服務項目'}</span>
                        </label>
                      </div>
                      {editingId === s.id ? (
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control form-control-sm mb-2"
                            name="name"
                            value={editForm.name}
                            onChange={handleEditChange}
                            required
                          />
                          <div className="input-group input-group-sm">
                            <select
                              className="form-select"
                              name="duration"
                              value={editForm.duration}
                              onChange={handleEditChange}
                              required
                            >
                              {!durationOptions.includes(Number(editForm.duration)) && editForm.duration ? (
                                <option value={editForm.duration}>{editForm.duration}</option>
                              ) : null}
                              {durationOptions.map((value) => (
                                <option key={value} value={String(value)}>{value}</option>
                              ))}
                            </select>
                            <span className="input-group-text">分鐘</span>
                          </div>
                        </div>
                      ) : null}
                      <div className="d-flex gap-2">
                        {editingId === s.id ? (
                          <>
                            <button className="btn btn-sm btn-outline-success" onClick={() => handleSave(s.id)} disabled={busyId === s.id}>
                              儲存
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit} disabled={busyId === s.id}>
                              取消
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-sm btn-outline-primary" onClick={() => startEdit(s)} disabled={busyId === s.id}>
                              編輯
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(s.id)} disabled={busyId === s.id}>
                              移除
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {services.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    尚未設定任何服務項目，請從左側新增
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Link to="/" className="btn btn-link btn-sm text-primary fw-bold text-decoration-none btn-back-link">
          <i className="bi bi-arrow-left me-1"></i> 返回儀表板
        </Link>
      </div>
    </main>
  );
}
