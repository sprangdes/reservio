import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';

interface DateOption {
  date: string;
  selectable: boolean;
}

interface DateStatus {
  businessName: string;
  serviceName: string;
  minDate: string;
  maxDate: string;
  dates: DateOption[];
}

interface DateSelectResult {
  selectedDate: string;
  availableTimes: string[];
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function weekdayLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
}

export default function LineReservationDatePage() {
  const location = useLocation();
  const token = useMemo(
    () => new URLSearchParams(location.search).get('token') || '',
    [location.search]
  );
  const [status, setStatus] = useState<DateStatus | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [result, setResult] = useState<DateSelectResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('缺少日期選擇資訊，請回 LINE 重新操作。');
      setLoading(false);
      return;
    }
    void api.lineReservationDateStatus(token)
      .then((response) => setStatus(response.data))
      .catch((reason) => setError(reason instanceof Error ? reason.message : '讀取可預約日期失敗'))
      .finally(() => setLoading(false));
  }, [token]);

  const selectDate = async (date: string) => {
    setSelectedDate(date);
    setSubmitting(true);
    setError('');
    try {
      const response = await api.selectLineReservationDate(token, date);
      setResult(response.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '選擇日期失敗');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <main className="container my-5">讀取可預約日期中…</main>;
  }

  if (error && !status) {
    return <main className="container my-5"><div className="alert alert-danger">{error}</div></main>;
  }

  if (!status) {
    return <main className="container my-5"><div className="alert alert-warning">找不到日期選擇資訊。</div></main>;
  }

  return (
    <main className="container my-4 line-date-page">
      <div className="card border-0 shadow-sm mx-auto" style={{ maxWidth: 720 }}>
        <div className="card-body p-4">
          <p className="text-muted mb-1">{status.businessName}</p>
          <h1 className="h4 mb-1">選擇預約日期</h1>
          <p className="mb-3">服務項目：{status.serviceName}</p>

          {error && <div className="alert alert-danger">{error}</div>}

          {result ? (
            <div className="alert alert-success mb-0">
              <div className="fw-bold mb-2">已選擇 {result.selectedDate}</div>
              <div>請回到 LINE 聊天室，輸入想預約的時段繼續。</div>
              <div className="mt-3">
                <div className="small text-muted mb-2">可預約時段：</div>
                <div className="d-flex flex-wrap gap-2">
                  {result.availableTimes.map((time) => (
                    <span key={time} className="badge text-bg-success fs-6">{time}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="line-date-grid" aria-label="可預約日期">
                {status.dates.map((option) => (
                  <button
                    key={option.date}
                    type="button"
                    className={`line-date-cell ${option.selectable ? '' : 'line-date-cell--disabled'}`}
                    disabled={!option.selectable || submitting}
                    onClick={() => void selectDate(option.date)}
                    aria-label={`${option.date}${option.selectable ? ' 可選擇' : ' 不可選擇'}`}
                  >
                    <span className="line-date-cell__weekday">週{weekdayLabel(option.date)}</span>
                    <span className="line-date-cell__date">{formatDateLabel(option.date)}</span>
                  </button>
                ))}
              </div>
              <p className="small text-muted mt-3 mb-0">
                灰色日期代表商家未營業或目前沒有可預約時段。選好日期後，請回 LINE 繼續選擇時間。
              </p>
              {selectedDate && submitting && (
                <p className="small text-muted mt-2 mb-0">正在儲存 {selectedDate}…</p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
