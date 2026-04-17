import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useToast } from '../state/ToastContext.jsx';

const weekDays = [
  { key: 'mon', label: '星期一', dayOfWeek: 'MONDAY' },
  { key: 'tue', label: '星期二', dayOfWeek: 'TUESDAY' },
  { key: 'wed', label: '星期三', dayOfWeek: 'WEDNESDAY' },
  { key: 'thu', label: '星期四', dayOfWeek: 'THURSDAY' },
  { key: 'fri', label: '星期五', dayOfWeek: 'FRIDAY' },
  { key: 'sat', label: '星期六', dayOfWeek: 'SATURDAY' },
  { key: 'sun', label: '星期日', dayOfWeek: 'SUNDAY' }
];

export default function BusinessInfoPage() {
  const { me, refresh } = useAuth();
  const { setSuccessMessage, setErrorMessage } = useToast();

  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ name: '', duration: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', duration: '' });
  const [busyId, setBusyId] = useState(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({
    name: '',
    category: '',
    phone: '',
    address: '',
    slotInterval: ''
  });
  const [categories, setCategories] = useState([]);
  const didLoadRef = useRef(false);

  const [hours, setHours] = useState(() =>
    weekDays.reduce((acc, day) => {
      acc[day.key] = { open: false, start: '09:00', end: '18:00' };
      return acc;
    }, {})
  );
  const [dateOverride, setDateOverride] = useState({
    date: '',
    open: true,
    start: '09:00',
    end: '18:00'
  });
  const [overrides, setOverrides] = useState([]);

  useEffect(() => {
    if (!me?.business) return;
    setInfoForm({
      name: me.business.name || '',
      category: me.business.category || '',
      phone: me.business.phone || '',
      address: me.business.address || '',
      slotInterval: me.business.slotInterval ?? ''
    });
  }, [me]);

  const load = async () => {
    if (!me?.business?.id) {
      setServices([]);
      return;
    }
    const res = await api.businessServices(me.business.id);
    setServices(res.data || []);
  };

  const loadCategories = async () => {
    try {
      const res = await api.businessCategories();
      const items = Array.isArray(res.data) ? res.data : [];
      setCategories(items);
    } catch (err) {
      setErrorMessage(err.message || '載入商家類別失敗');
    }
  };

  const loadDefaultSlots = async () => {
    try {
      const res = await api.getDefaultSlots();
      const data = res.data || {};
      if (data.defaultInterval != null && data.defaultInterval !== '') {
        setInfoForm((prev) => ({ ...prev, slotInterval: String(data.defaultInterval) }));
      }
      if (Array.isArray(data.defaultWeekSlots)) {
        const slotMap = weekDays.reduce((acc, day) => {
          acc[day.key] = { open: false, start: '09:00', end: '18:00' };
          return acc;
        }, {});
        data.defaultWeekSlots.forEach((slot) => {
          const dayKey = weekDays.find((item) => item.dayOfWeek === slot.dayOfWeek)?.key;
          if (!dayKey) return;
          slotMap[dayKey] = {
            open: !!slot.startTime && !!slot.endTime,
            start: slot.startTime ? String(slot.startTime).slice(0, 5) : '09:00',
            end: slot.endTime ? String(slot.endTime).slice(0, 5) : '18:00'
          };
        });
        setHours(slotMap);
      }
    } catch (err) {
      setErrorMessage(err.message || '取得預設營業時間失敗');
    }
  };

  const getTodayString = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const loadDateSlot = async (date) => {
    try {
      const targetDate = date || getTodayString();
      const res = await api.getDateSlot({ date: targetDate });
      const data = res.data || {};
      setDateOverride({
        date: data.date || targetDate,
        open: data.open !== false,
        start: data.startTime ? String(data.startTime).slice(0, 5) : '09:00',
        end: data.endTime ? String(data.endTime).slice(0, 5) : '18:00'
      });
    } catch (err) {
      setErrorMessage(err.message || '取得當日營業時間失敗');
    }
  };

  const loadAdjustedSlots = async () => {
    try {
      const res = await api.getAdjustedSlots();
      const data = Array.isArray(res.data) ? res.data : [];
      const mapped = data.map((item) => ({
        date: item.date,
        open: item.open !== false,
        start: item.startTime ? String(item.startTime).slice(0, 5) : '09:00',
        end: item.endTime ? String(item.endTime).slice(0, 5) : '18:00'
      }));
      mapped.sort((a, b) => String(a.date).localeCompare(String(b.date)));
      setOverrides(mapped);
    } catch (err) {
      setErrorMessage(err.message || '取得已調整時段失敗');
    }
  };

  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    void load();
    void loadCategories();
    void loadDefaultSlots();
    void loadDateSlot();
    void loadAdjustedSlots();
  }, [me]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleInfoChange = (event) => {
    const { name, value } = event.target;
    setInfoForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleInfoSave = async () => {
    try {
      setSavingInfo(true);
      const intervalValue = infoForm.slotInterval === '' ? null : Number(infoForm.slotInterval);
      const payload = {
        name: infoForm.name.trim() || null,
        category: infoForm.category.trim() || null,
        phone: infoForm.phone.trim() || null,
        address: infoForm.address.trim() || null,
        slotInterval: Number.isFinite(intervalValue) ? intervalValue : null
      };
      await api.updateBusinessInfo(payload);
      await refresh();
      setSuccessMessage('商家資訊更新成功');
    } catch (err) {
      setErrorMessage(err.message || '商家資訊更新失敗');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.addServiceItem({ name: form.name, duration: Number(form.duration) });
      setSuccessMessage('服務項目新增成功');
      setForm({ name: '', duration: '' });
      await load();
    } catch (err) {
      setErrorMessage(err.message || '服務項目新增失敗');
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ name: item.name, duration: String(item.duration) });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', duration: '' });
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (id) => {
    try {
      setBusyId(id);
      await api.modifyServiceItem(id, { name: editForm.name, duration: Number(editForm.duration) });
      setSuccessMessage('服務項目更新成功');
      setEditingId(null);
      await load();
    } catch (err) {
      setErrorMessage(err.message || '服務項目更新失敗');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!globalThis.confirm('確定要刪除此服務項目嗎？')) {
      return;
    }
    try {
      setBusyId(id);
      await api.deleteServiceItem(id);
      setSuccessMessage('服務項目刪除成功');
      await load();
    } catch (err) {
      setErrorMessage(err.message || '服務項目刪除失敗');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggle = async (item) => {
    const nextActive = !item.active;
    try {
      setBusyId(item.id);
      if (nextActive) {
        await api.serviceOn(item.id);
        setSuccessMessage('服務項目啟用成功');
      } else {
        await api.serviceOff(item.id);
        setSuccessMessage('服務項目停用成功');
      }
      await load();
    } catch (err) {
      setErrorMessage(err.message || '服務狀態切換失敗');
    } finally {
      setBusyId(null);
    }
  };

  const toggleDay = (dayKey) => {
    setHours((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], open: !prev[dayKey].open }
    }));
  };

  const updateDayTime = (dayKey, field, value) => {
    setHours((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [field]: value }
    }));
  };

  const handleSaveDefaultSlots = async () => {
    try {
      const payload = {
        defaultInterval: infoForm.slotInterval === '' ? null : Number(infoForm.slotInterval),
        defaultWeekSlots: weekDays.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          startTime: hours[day.key].open ? hours[day.key].start : null,
          endTime: hours[day.key].open ? hours[day.key].end : null
        }))
      };
      await api.setDefaultSlots(payload);
      setSuccessMessage('預設營業時間已更新');
    } catch (err) {
      setErrorMessage(err.message || '儲存預設營業時間失敗');
    }
  };

  const handleOverrideChange = (event) => {
    const { name, value, type, checked } = event.target;
    setDateOverride((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDateChange = (event) => {
    const nextDate = event.target.value;
    setDateOverride((prev) => ({ ...prev, date: nextDate }));
    if (nextDate) {
      void loadDateSlot(nextDate);
    }
  };

  const handleDeleteOverride = async (date) => {
    try {
      await api.deleteDateSlot({ date });
      setSuccessMessage('已刪除指定日期調整');
      await loadAdjustedSlots();
    } catch (err) {
      setErrorMessage(err.message || '刪除指定日期調整失敗');
    }
  };

  const handleSaveDateAdjust = async () => {
    try {
      if (!dateOverride.date) {
        setErrorMessage('請先選擇日期');
        return;
      }
      const payload = {
        date: dateOverride.date,
        open: dateOverride.open,
        startTime: dateOverride.open ? dateOverride.start : null,
        endTime: dateOverride.open ? dateOverride.end : null
      };
      await api.adjustDateSlot(payload);
      setSuccessMessage('指定日期調整已儲存');
      await loadAdjustedSlots();
    } catch (err) {
      setErrorMessage(err.message || '儲存指定日期調整失敗');
    }
  };

  const resolvedInterval = Number(infoForm.slotInterval || me?.business?.slotInterval || 30) || 30;
  const buildDurationOptions = (interval, maxMinutes = 480) => {
    const safe = Number.isFinite(interval) && interval > 0 ? interval : 30;
    const values = [];
    for (let value = safe; value <= maxMinutes; value += safe) {
      values.push(value);
    }
    return values;
  };

  const durationOptions = buildDurationOptions(resolvedInterval);
  const hasCustomDurationOption = (value) =>
    !durationOptions.includes(Number(value)) && Boolean(value);

  const renderDurationOptionItems = (currentValue) => (
    <>
      {hasCustomDurationOption(currentValue) && (
        <option value={currentValue}>{currentValue}</option>
      )}
      {durationOptions.map((value) => (
        <option key={value} value={String(value)}>{value}</option>
      ))}
    </>
  );

  const renderEditDurationInput = () => (
    <div className="input-group input-group-sm">
      <select className="form-select" name="duration" value={editForm.duration} onChange={handleEditChange} required>
        {renderDurationOptionItems(editForm.duration)}
      </select>
      <span className="input-group-text">分鐘</span>
    </div>
  );

  const renderDurationBadge = (duration) => (
    <span className="badge rounded-pill bg-light text-primary border border-primary border-opacity-25 px-3 py-2">
      <i className="bi bi-stopwatch me-1"></i> {duration} 分鐘
    </span>
  );

  const renderServiceToggle = (service, withTitle = false) => {
    const title = withTitle ? (service.active ? '已啟用' : '已停用') : undefined;
    return (
      <label className="switch" title={title}>
        <input type="checkbox" checked={!!service.active} disabled={busyId === service.id} onChange={() => handleToggle(service)}/>
        <span className="slider"></span>
      </label>
    );
  };

  const renderEditingActions = (serviceId, mobile = false) => {
    if (mobile) {
      return (
        <>
          <button className="btn btn-sm btn-outline-success" onClick={() => handleSave(serviceId)} disabled={busyId === serviceId}>儲存</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit} disabled={busyId === serviceId}>取消</button>
        </>
      );
    }
    return (
      <div className="btn-group">
        <button className="btn btn-sm btn-outline-success" onClick={() => handleSave(serviceId)} disabled={busyId === serviceId}><i className="bi bi-check-lg"></i>儲存</button>
        <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit} disabled={busyId === serviceId}>取消</button>
      </div>
    );
  };

  const renderDisplayActions = (service, mobile = false) => {
    if (mobile) {
      return (
        <>
          <button className="btn btn-sm btn-outline-primary" onClick={() => startEdit(service)} disabled={busyId === service.id}>編輯</button>
          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(service.id)} disabled={busyId === service.id}>移除</button>
        </>
      );
    }
    return (
      <div className="btn-group">
        <button className="btn btn-sm btn-link text-primary text-decoration-none" onClick={() => startEdit(service)} disabled={busyId === service.id}><i className="bi bi-pencil-square"></i> 編輯</button>
        <button className="btn btn-sm btn-link text-danger text-decoration-none" onClick={() => handleDelete(service.id)} disabled={busyId === service.id}><i className="bi bi-trash3"></i> 移除</button>
      </div>
    );
  };

  const renderMainContent = () => (
    <main className="container list-page">
      <div className="card shadow-sm border-0 overflow-hidden mb-4">
        <div className="card-header bg-gradient text-white text-white-strong p-4">
          <h4 className="mb-0 fw-bold"><i className="bi bi-shop me-2"></i>商家資訊</h4>
        </div>
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="small text-muted form-label" htmlFor="biz-name">商家名稱</label>
              <input id="biz-name" name="name" type="text" className="form-control" value={infoForm.name} onChange={handleInfoChange} placeholder="商家名稱"/>
            </div>
            <div className="col-md-6">
              <label className="small text-muted form-label" htmlFor="biz-category">商家類別</label>
              <select id="biz-category" name="category" className="form-select" value={infoForm.category} onChange={handleInfoChange}>
                <option value="">請選擇</option>
                {categories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="small text-muted form-label" htmlFor="biz-phone">聯絡電話</label>
              <input id="biz-phone" name="phone" type="text" className="form-control" value={infoForm.phone} onChange={handleInfoChange} placeholder="聯絡電話"/>
            </div>
            <div className="col-md-6">
              <label className="small text-muted form-label" htmlFor="biz-address">地址</label>
              <input id="biz-address" name="address" type="text" className="form-control" value={infoForm.address} onChange={handleInfoChange} placeholder="地址"/>
            </div>
          </div>
          <div className="text-end mt-4">
            <button type="button" className="btn btn-gradient fw-bold shadow-sm" onClick={handleInfoSave} disabled={savingInfo}>
              {savingInfo ? '儲存中...' : '儲存商家資訊'}
            </button>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 overflow-hidden mb-4">
        <div className="card-header bg-gradient text-white text-white-strong p-4 d-flex justify-content-between align-items-center">
          <h4 className="mb-0 fw-bold"><i className="bi bi-calendar-week me-2"></i>預設營業時間（每週）</h4>
        </div>
        <div className="card-body p-4">
          <div className="row g-3 align-items-end mb-4">
            <div className="col-md-5 col-lg-4">
              <label className="small text-muted form-label" htmlFor="biz-slot">預設時段間隔 (分鐘)</label>
              <input id="biz-slot" name="slotInterval" type="number" className="form-control" min="5" step="5" value={infoForm.slotInterval} onChange={handleInfoChange} placeholder="30"/>
              <div className="form-text">會影響服務時長可選項與可預約的時段切分。</div>
            </div>
          </div>
          <div className="row g-3">
            {weekDays.map((day) => (
              <div key={day.key} className="col-12 col-md-6">
                <div className="border rounded-3 p-3 h-100 d-flex flex-column gap-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="fw-bold">{day.label}</div>
                    <div className="form-check form-switch mb-0">
                      <input className="form-check-input" type="checkbox" checked={hours[day.key].open} onChange={() => toggleDay(day.key)}/>
                      <label className="form-check-label text-muted small">營業</label>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <input type="time" className="form-control form-control-sm" value={hours[day.key].start} onChange={(e) => updateDayTime(day.key, 'start', e.target.value)} style={{ maxWidth: '140px' }} disabled={!hours[day.key].open}/>
                    <span className="text-muted">至</span>
                    <input type="time" className="form-control form-control-sm" value={hours[day.key].end} onChange={(e) => updateDayTime(day.key, 'end', e.target.value)} style={{ maxWidth: '140px' }} disabled={!hours[day.key].open}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-end">
            <button className="btn btn-gradient fw-bold shadow-sm" onClick={handleSaveDefaultSlots}>儲存預設營業時間</button>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 overflow-hidden mb-4">
        <div className="card-header bg-gradient text-white text-white-strong p-4 d-flex justify-content-between align-items-center">
          <h4 className="mb-0 fw-bold"><i className="bi bi-calendar-event me-2"></i>指定日期調整</h4>
        </div>
        <div className="card-body p-4">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label fw-bold small text-muted">日期</label>
              <input type="date" className="form-control" name="date" value={dateOverride.date} onChange={handleDateChange}/>
            </div>
            <div className="col-md-2">
              <label className="form-label fw-bold small text-muted">是否營業</label>
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" name="open" checked={dateOverride.open} onChange={handleOverrideChange}/>
                <label className="form-check-label text-muted small">營業</label>
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-bold small text-muted">開始時間</label>
              <input type="time" className="form-control" name="start" value={dateOverride.start} onChange={handleOverrideChange} disabled={!dateOverride.open}/>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-bold small text-muted">結束時間</label>
              <input type="time" className="form-control" name="end" value={dateOverride.end} onChange={handleOverrideChange} disabled={!dateOverride.open}/>
            </div>
          </div>

          <div className="mt-4">
            {overrides.length === 0 && (
              <div className="text-muted small">尚無指定日期調整。</div>
            )}
            {overrides.length > 0 && (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>日期</th>
                      <th>狀態</th>
                      <th>時間</th>
                      <th className="text-end">管理</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overrides.map((item) => (
                      <tr key={item.date}>
                        <td>{item.date}</td>
                        <td>{item.open ? '營業' : '休息'}</td>
                        <td>{item.open ? `${item.start} - ${item.end}` : '—'}</td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteOverride(item.date)}>移除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="mt-3 text-end">
            <button className="btn btn-gradient fw-bold shadow-sm" onClick={handleSaveDateAdjust}>
              儲存指定日期調整
            </button>
          </div>
        </div>
      </div>

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
                  <input type="text" className="form-control border-light bg-light" id="name" name="name" value={form.name} onChange={handleChange} placeholder="例如：精緻剪髮" required/>
                </div>
                <div className="mb-4">
                  <label htmlFor="duration" className="form-label fw-bold small text-muted">服務時長 (分鐘)</label>
                  <div className="input-group">
                    <select className="form-select border-light bg-light" id="duration" name="duration" value={form.duration} onChange={handleChange} required>
                      <option value="">請選擇時長</option>
                      {renderDurationOptionItems(form.duration)}
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
          <div className="card shadow-sm border-0 rounded-3 overflow-hidden reservation-card service-section">
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
                            <input type="text" className="form-control form-control-sm" name="name" value={editForm.name} onChange={handleEditChange} required/>
                          ) : (
                            s.name
                          )}
                        </td>
                        <td className="text-center">
                          {editingId === s.id ? (
                            renderEditDurationInput()
                          ) : (
                            renderDurationBadge(s.duration)
                          )}
                        </td>
                        <td className="text-center">
                          {renderServiceToggle(s, true)}
                        </td>
                        <td className="text-center pe-4">
                          {editingId === s.id ? (
                            renderEditingActions(s.id)
                          ) : (
                            renderDisplayActions(s)
                          )}
                        </td>
                      </tr>
                    ))}
                    {services.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center text-muted py-5">
                          <i className="bi bi-journal-x display-4 d-block mb-3 opacity-25"></i>尚未設定任何服務項目，請從左側新增
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mobile-list p-3">
                {services.map((s) => (
                  <div key={s.id} className="card mb-3 shadow-sm">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="fw-bold">{s.name}</div>
                        {renderDurationBadge(s.duration)}
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="text-muted small">啟用</span>
                        {renderServiceToggle(s)}
                      </div>
                      {editingId === s.id && (
                        <div className="mb-3">
                          <input type="text" className="form-control form-control-sm mb-2" name="name" value={editForm.name} onChange={handleEditChange} required/>
                          {renderEditDurationInput()}
                        </div>
                      )}
                      <div className="d-flex gap-2">
                        {editingId === s.id ? (
                          renderEditingActions(s.id, true)
                        ) : (
                          renderDisplayActions(s, true)
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {services.length === 0 && (
                  <div className="text-center text-muted py-4">
                    尚未設定任何服務項目，請從左側新增
                  </div>
                )}
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

  if (!me?.business) {
    return (
      <main className="container list-page">
        <div className="alert alert-warning">非商家帳號無法管理商家資訊。</div>
      </main>
    );
  }

  return renderMainContent();
}
