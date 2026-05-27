import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../state/ToastContext';
import type { ServiceOption } from '../components/reservations/types';
import { useAuth } from '../state/AuthContext';

type SlotItem = { time: string; available: boolean };
type NewReservationForm = {
  businessId: string;
  title: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  remark: string;
};

export default function ReservationNewPage() {
  const { setSuccessMessage, setErrorMessage } = useToast();
  const { me } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Array<{ id: string | number; name: string }>>([]);
  const [usingPreferred, setUsingPreferred] = useState(false);
  const [services, setServices] = useState<Array<ServiceOption & { duration?: number; active?: boolean }>>([]);
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [form, setForm] = useState<NewReservationForm>({
    businessId: '',
    title: '',
    reservationDate: '',
    startTime: '',
    endTime: '',
    remark: ''
  });
  const [serviceDuration, setServiceDuration] = useState<number | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef(form);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const selectedService = useMemo(() => services.find((s) => s.name === form.title), [services, form.title]);

  useEffect(() => {
    const load = async () => {
      if (me?.role === 'ROLE_BUSINESS') {
        const businessRes = await api.businesses();
        setBusinesses(businessRes.data || []);
        return;
      }
      const preferredRes = await api.getPreferredBusinesses();
      setBusinesses(preferredRes.data || []);
      setUsingPreferred(true);
    };
    void load();
  }, [me?.role]);

  useEffect(() => {
    if (!form.businessId) {
      setServices([]);
      setForm({ ...form, title: '' });
      return;
    }

    const load = async () => {
      const res = await api.businessServices(form.businessId);
      const list = (res.data || []).filter((item: { active?: boolean }) => item.active);
      setServices(list);
      const disabledRes = await api.disabledDates(form.businessId);
      setDisabledDates(disabledRes.data || []);
    };
    void load();
  }, [form.businessId]);

  useEffect(() => {
    setServiceDuration(selectedService?.duration ?? null);
  }, [selectedService]);

  useEffect(() => {
    setForm({ ...form, startTime: '', endTime: '' });
  }, [form.title]);

  useEffect(() => {
    if (!dateInputRef.current || !(globalThis as any).flatpickr) return;

    const today = new Date();
    const minDate = today.toISOString().split('T')[0];
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(today.getMonth() + 3);
    const maxDate = threeMonthsLater.toISOString().split('T')[0];

    const fp = (globalThis as any).flatpickr(dateInputRef.current, {
      locale: 'zh_tw',
      dateFormat: 'Y-m-d',
      minDate,
      maxDate,
      disable: disabledDates,
      disableMobile: true,
      onChange: (_: unknown, dateStr: string) => {
        setForm({
          ...formRef.current,
          reservationDate: dateStr,
          startTime: '',
          endTime: ''
        });
      }
    });

    return () => fp.destroy();
  }, [disabledDates]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!form.reservationDate || !serviceDuration) {
        setSlots([]);
        return;
      }
      if (!form.businessId) {
        setSlots([]);
        return;
      }
      const res = await api.slots(form.reservationDate, serviceDuration, form.businessId);
      setSlots(res.data || []);
    };
    void loadSlots();
  }, [form.reservationDate, serviceDuration, form.businessId]);

  useEffect(() => {
    if (!form.startTime || !serviceDuration) {
      setForm({ ...form, endTime: '' });
      return;
    }
    const [hours, minutes] = form.startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes + Number(serviceDuration), 0);
    const endHours = String(date.getHours()).padStart(2, '0');
    const endMinutes = String(date.getMinutes()).padStart(2, '0');
    setForm({ ...form, endTime: `${endHours}:${endMinutes}` });
  }, [form.startTime, serviceDuration]);

  const handleChange = (event: { target: { name: string; value: string } }) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    try {
      await api.createReservation({
        businessId: Number(form.businessId),
        reservationDate: form.reservationDate,
        startTime: form.startTime,
        endTime: form.endTime,
        title: form.title,
        remark: form.remark
      });
      setSuccessMessage('預約成功');
      navigate('/');
    } catch (err) {
      setErrorMessage(err.message || '預約失敗');
    }
  };

  let servicePlaceholder = '請先選擇店家..';
  if (form.businessId) {
    servicePlaceholder = services.length ? '請選擇項目...' : '該店家目前無提供服務';
  }

  let slotPlaceholder = '請先選擇日期..';
  if (form.reservationDate) {
    slotPlaceholder = slots.length === 0 ? '該日無可用時段' : '請選擇時段...';
  }

  return (
    <main>
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-gradient text-white text-white-strong p-4 text-center">
                <h4 className="mb-0 fw-bold"><i className="bi bi-calendar-plus"></i> 建立新預約</h4>
                <p className="mb-0 mt-2 opacity-75">請填寫預約詳細資訊</p>
              </div>
              <div className="card-body p-4 p-lg-5">
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <h6 className="text-primary fw-bold mb-3"><i className="bi bi-shop me-1"></i> 選擇預約店家</h6>
                    {usingPreferred && businesses.length === 0 ? (
                      <div className="alert alert-warning py-2 small">
                        你尚未設定想預約店家，請先至「想預約店家」頁面設定。
                      </div>
                    ) : null}
                    <select className="form-select form-select-sm" id="businessId" name="businessId" value={form.businessId} onChange={handleChange} required>
                      <option value="" disabled>請選擇店家...</option>
                      {businesses.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4">
                    <h6 className="text-primary fw-bold mb-3"><i className="bi bi-1-circle-fill me-1"></i> 選擇預約項目</h6>
                    <div className="mb-2">
                      <select
                        className="form-select form-select-sm"
                        id="title"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        required
                        disabled={!form.businessId}
                      >
                        <option value="" disabled>
                          {servicePlaceholder}
                        </option>
                        {services.map((s) => (
                          <option key={s.id} value={s.name} data-duration={s.duration}>
                            {s.name} ({s.duration} 分鐘)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h6 className="text-primary fw-bold mb-3"><i className="bi bi-2-circle-fill me-1"></i> 選擇預約日期</h6>
                    <div className="row">
                      <div className="col-md-6">
                        <input
                          type="text"
                          className="form-control form-control-sm bg-white"
                          id="reservationDate"
                          name="reservationDate"
                          placeholder="請選擇日期.."
                          ref={dateInputRef}
                          value={form.reservationDate}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h6 className="text-primary fw-bold mb-3"><i className="bi bi-3-circle-fill me-1"></i> 選擇預約時間</h6>
                    <div className="row">
                      <div className="col-md-6">
                        <select
                          className="form-select form-select-sm"
                          id="startTime"
                          name="startTime"
                          value={form.startTime}
                          onChange={handleChange}
                          required
                          disabled={!form.reservationDate || !serviceDuration || slots.length === 0}
                        >
                          <option value="" disabled>
                            {slotPlaceholder}
                          </option>
                          {slots.map((slot) => (
                            <option key={slot.time} value={slot.time} disabled={!slot.available}>
                              {slot.available ? slot.time : `${slot.time} (時段不足或已被預約)`}
                            </option>
                          ))}
                        </select>
                        <input type="hidden" id="endTime" name="endTime" value={form.endTime} />
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h6 className="text-primary fw-bold mb-3"><i className="bi bi-4-circle-fill me-1"></i> 其他備註 (選填)</h6>
                    <textarea
                      className="form-control form-control-sm"
                      id="remark"
                      name="remark"
                      rows={2}
                      placeholder="是否有其他特殊要求？"
                      value={form.remark}
                      onChange={handleChange}
                    ></textarea>
                  </div>

                  <hr className="my-4 opacity-25" />

                  <div className="d-flex justify-content-between align-items-center">
                    <button type="button" className="text-muted small text-decoration-none btn btn-link" onClick={() => navigate(-1)}>
                      <i className="bi bi-arrow-left"></i> 返回
                    </button>
                    <button type="submit" className="btn btn-gradient px-4 fw-bold shadow-sm">送出預約</button>
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
