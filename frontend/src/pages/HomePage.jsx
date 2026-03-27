import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useToast } from '../state/ToastContext.jsx';

export default function HomePage() {
  const { me, refresh } = useAuth();
  const { errorMessage, setErrorMessage } = useToast();
  const [dashboard, setDashboard] = useState(null);
  const [calendarView, setCalendarView] = useState('week');
  const [isMobile, setIsMobile] = useState(false);
  const [todayReservations, setTodayReservations] = useState([]);
  const [weekReservations, setWeekReservations] = useState([]);
  const [monthReservations, setMonthReservations] = useState([]);

  useEffect(() => {
    if (!me) {
      refresh();
    }
  }, [me, refresh]);

  useEffect(() => {
    const load = async () => {
      if (!me) {
        setDashboard(null);
        return;
      }
      try {
        const res = await api.dashboard();
        setDashboard(res.data);
      } catch {
        setDashboard(null);
      }
    };
    load();
  }, [me]);

  useEffect(() => {
    const loadTodayReservations = async () => {
      if (!me) {
        setTodayReservations([]);
        return;
      }
      try {
        const res = await api.todayReservations();
        const items = res?.data || res?.items || res || [];
        setTodayReservations(Array.isArray(items) ? items : []);
      } catch (err) {
        setErrorMessage(err.message || '載入今日預約失敗');
      }
    };
    loadTodayReservations();
  }, [me, setErrorMessage]);

  useEffect(() => {
    const loadWeekReservations = async () => {
      if (!me) {
        setWeekReservations([]);
        return;
      }
      try {
        const res = await api.weekReservations();
        const items = res?.data || res?.items || res || [];
        setWeekReservations(Array.isArray(items) ? items : []);
      } catch (err) {
        setErrorMessage(err.message || '載入一週預約失敗');
      }
    };
    if (calendarView === 'week') {
      loadWeekReservations();
    }
  }, [calendarView, me, setErrorMessage]);

  useEffect(() => {
    const loadMonthReservations = async () => {
      if (!me) {
        setMonthReservations([]);
        return;
      }
      try {
        const res = await api.monthReservations();
        const items = res?.data || res?.items || res || [];
        setMonthReservations(Array.isArray(items) ? items : []);
      } catch (err) {
        setErrorMessage(err.message || '載入一月預約失敗');
      }
    };
    if (calendarView === 'month') {
      loadMonthReservations();
    }
  }, [calendarView, me, setErrorMessage]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => {
      const mobile = media.matches;
      setIsMobile(mobile);
      setCalendarView(mobile ? 'day' : 'week');
    };
    update();
    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const currentMonthLabel = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  }, []);

  const calendarItems = useMemo(() => {
    if (calendarView === 'week') {
      return weekReservations.map((item, idx) => ({
        id: item.id ?? `week-${idx}`,
        date: item.reservationDate,
        start: item.startTime,
        end: item.endTime,
        service: item.title,
        customerName: item.username,
        businessName: item.businessName
      }));
    }
    if (calendarView === 'month') {
      return monthReservations.map((item, idx) => ({
        id: item.id ?? `month-${idx}`,
        date: item.reservationDate,
        start: item.startTime,
        end: item.endTime,
        service: item.title,
        customerName: item.username,
        businessName: item.businessName
      }));
    }
    return [];
  }, [calendarView, monthReservations, weekReservations]);

  const timeLabels = useMemo(
    () => Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
    []
  );

  const weekDates = useMemo(() => {
    const base = new Date();
    const day = base.getDay();
    const sunday = new Date(base);
    sunday.setDate(base.getDate() - day);
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + idx);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
  }, []);

  const monthDays = useMemo(() => {
    const base = new Date();
    const year = base.getFullYear();
    const month = base.getMonth();
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
    return Array.from({ length: totalCells }, (_, idx) => {
      const dayNum = idx - startWeekday + 1;
      const dateObj = new Date(year, month, dayNum);
      const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(
        dateObj.getDate()
      ).padStart(2, '0')}`;
      const inMonth = dateObj.getMonth() === month;
      return { dateStr, inMonth };
    });
  }, []);

  const weekDayLabels = useMemo(() => ['日', '一', '二', '三', '四', '五', '六'], []);

  const dayItems = useMemo(() => {
    return todayReservations.map((item, idx) => {
      const mapped = {
        id: item.id ?? `today-${idx}`,
        date: item.reservationDate ?? today,
        start: item.startTime || item.start,
        end: item.endTime || item.end,
        service: item.title,
        customerName: item.username,
        businessName: item.businessName
      };
      if (!mapped.start || !mapped.end) {
        return null;
      }
      const [sh, sm] = mapped.start.split(':').map(Number);
      const [eh, em] = mapped.end.split(':').map(Number);
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      return { ...mapped, startMinutes, endMinutes, duration: Math.max(endMinutes - startMinutes, 15) };
    }).filter(Boolean);
  }, [today, todayReservations]);

  const groupedByDate = useMemo(() => {
    return dayItems.reduce((acc, item) => {
      acc[item.date] = acc[item.date] || [];
      acc[item.date].push(item);
      return acc;
    }, {});
  }, [dayItems]);

  return (
    <main>
      <header className="hero-section text-center">
        <div className="container">
          {!me ? (
            <div>
              <h1 className="display-3 fw-bold mb-4 text-white-strong">歡迎來到 Reservio</h1>
              <p className="lead mb-5 text-white-strong">最直覺、最快速的預約系統，讓管理預約不再是難事。</p>
              <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
                <Link to="/register" className="btn btn-light btn-lg px-4 gap-3 fw-bold text-primary">
                  開始使用
                </Link>
                <Link to="/login" className="btn btn-outline-light btn-lg px-4">
                  立即登入
                </Link>
              </div>
            </div>
          ) : me.role === 'ROLE_BUSINESS' ? (
            <div>
              <h1 className="display-4 fw-bold mb-3 text-white-strong">
                店長 <span className="text-warning">{me.business?.name}</span>，你好！
              </h1>
              <p className="lead mb-4 text-white-strong">歡迎回來，這是您今日的營運概況。</p>

              <div className="row justify-content-center mt-4">
                <div className="col-md-10">
                  <div className="card bg-white bg-opacity-10 border-0 shadow-lg text-white text-white-strong p-4 dashboard-card" style={{ backdropFilter: 'blur(10px)' }}>
                    <div className="row align-items-center">
                          <Link
                            to="/reservation/today/manage"
                            className="col-sm-4 border-end border-white border-opacity-25 text-decoration-none text-white dashboard-card-link"
                          >
                        <h5 className="small text-uppercase opacity-75">今日預約</h5>
                        <p className="h2 mb-0">{dashboard?.todayCount ?? 0}</p>
                      </Link>
                          <Link
                            to="/reservation/pending/manage"
                            className="col-sm-4 border-end border-white border-opacity-25 text-decoration-none text-white dashboard-card-link"
                          >
                        <h5 className="small text-uppercase opacity-75">待處理預約</h5>
                        <p className="h2 mb-0">{dashboard?.pendingCount ?? 0}</p>
                      </Link>
                      <div className="col-sm-4">
                        <div className="d-grid gap-2">
                          <Link to="/service/manage" className="btn btn-warning fw-bold shadow-sm no-text-shadow">
                            管理服務項目
                          </Link>
                          <Link to="/reservation/manage" className="btn btn-light fw-bold shadow-sm no-text-shadow">
                            查看所有預約
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="display-4 fw-bold mb-3 text-white-strong">
                你好，<span className="text-warning">{me.username}</span>！
              </h1>
              <p className="lead mb-4 text-white-strong">歡迎回來，今天想預約哪些服務呢？</p>

              <div className="row justify-content-center mt-4">
                <div className="col-md-8">
                  <div className="card bg-white bg-opacity-10 border-0 shadow-lg text-white text-white-strong p-4 dashboard-card dashboard-card--customer" style={{ backdropFilter: 'blur(10px)' }}>
                    <div className="row align-items-center">
                      <div className="col-sm-6 border-end border-white border-opacity-25">
                        <h5 className="small text-uppercase opacity-75">我的今日預約</h5>
                        <p className="h2 mb-0">{dashboard?.todayCount ?? 0}</p>
                      </div>
                      <div className="col-sm-6 text-center">
                        <Link to="/reservation/new" className="btn btn-light fw-bold px-4 shadow-sm no-text-shadow">
                          <i className="bi bi-calendar-plus me-1"></i> 立即預約
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {me ? (
        <section className="container my-5">
          <div className="card shadow-sm border-0 overflow-hidden calendar-card">
            <div className="card-header bg-gradient text-white text-white-strong p-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div className="fw-bold">
                  <i className="bi bi-calendar3 me-2"></i>行事曆
                </div>
                <div className="btn-group">
                  <button
                    type="button"
                    className={`btn btn-sm ${calendarView === 'day' ? 'btn-light text-primary fw-bold' : 'btn-outline-light'}`}
                    onClick={() => setCalendarView('day')}
                  >
                    日
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${calendarView === 'week' ? 'btn-light text-primary fw-bold' : 'btn-outline-light'}`}
                    onClick={() => setCalendarView('week')}
                  >
                    週
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${calendarView === 'month' ? 'btn-light text-primary fw-bold' : 'btn-outline-light'}`}
                    onClick={() => setCalendarView('month')}
                  >
                    月
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              {calendarView === 'day' ? (
                <div className="calendar-day">
                  <div className="calendar-day__times">
                    <div className="calendar-day__date">{today}</div>
                    {timeLabels.map((label) => (
                      <div key={label} className="calendar-day__time">
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="calendar-day__slots">
                    {timeLabels.map((label) => (
                      <div key={label} className="calendar-day__row" />
                    ))}
                    {dayItems.map((item) => {
                      const top = (item.startMinutes / 60) * 48;
                      const height = (item.duration / 60) * 48;
                      const title = me?.role === 'ROLE_BUSINESS' ? item.customerName : item.businessName;
                      return (
                        <div
                          key={item.id}
                          className="calendar-day__event"
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          <div className="calendar-day__event-title">{title}</div>
                          <div className="calendar-day__event-sub">
                            {item.service} · {item.start} - {item.end}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {calendarView === 'week' ? (
                isMobile ? (
                  <div className="calendar-week-grid calendar-week-grid--scroll">
                    <div className="calendar-week-grid__fixed-col">
                      <div className="calendar-week-grid__corner"></div>
                      <div className="calendar-week-grid__timescol">
                        {timeLabels.map((label) => (
                          <div key={label} className="calendar-week-grid__time">
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="calendar-week-grid__scroll">
                      <div className="calendar-week-grid__scroll-inner">
                        <div className="calendar-week-grid__header">
                          {weekDates.map((date, idx) => (
                            <div key={date} className="calendar-week-grid__dayhead">
                              <div className="calendar-week-grid__dayname">星期{weekDayLabels[idx]}</div>
                              <div className="calendar-week-grid__date">{date}</div>
                            </div>
                          ))}
                        </div>
                        <div className="calendar-week-grid__weekcols">
                          {weekDates.map((date) => {
                            const items = calendarItems.filter((item) => item.date === date);
                            return (
                              <div key={date} className="calendar-week-grid__daycol">
                                {timeLabels.map((label) => (
                                  <div key={label} className="calendar-day__row" />
                                ))}
                                {items.map((item) => {
                                  const [sh, sm] = item.start.split(':').map(Number);
                                  const [eh, em] = item.end.split(':').map(Number);
                                  const startMinutes = sh * 60 + sm;
                                  const endMinutes = eh * 60 + em;
                                  const duration = Math.max(endMinutes - startMinutes, 15);
                                  const top = (startMinutes / 60) * 48;
                                  const height = (duration / 60) * 48;
                                  const title = me?.role === 'ROLE_BUSINESS' ? item.customerName : item.businessName;
                                  return (
                                    <div
                                      key={item.id}
                                      className="calendar-day__event"
                                      style={{ top: `${top}px`, height: `${height}px` }}
                                    >
                                      <div className="calendar-day__event-title">{title}</div>
                                      <div className="calendar-day__event-sub">
                                        {item.service} · {item.start} - {item.end}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="calendar-week-grid calendar-week-grid--scroll">
                    <div className="calendar-week-grid__fixed-col">
                      <div className="calendar-week-grid__corner"></div>
                      <div className="calendar-week-grid__timescol">
                        {timeLabels.map((label) => (
                          <div key={label} className="calendar-week-grid__time">
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="calendar-week-grid__scroll">
                      <div className="calendar-week-grid__scroll-inner">
                        <div className="calendar-week-grid__header">
                          {weekDates.map((date, idx) => (
                            <div key={date} className="calendar-week-grid__dayhead">
                              <div className="calendar-week-grid__dayname">星期{weekDayLabels[idx]}</div>
                              <div className="calendar-week-grid__date">{date}</div>
                            </div>
                          ))}
                        </div>
                        <div className="calendar-week-grid__weekcols">
                          {weekDates.map((date) => {
                            const items = calendarItems.filter((item) => item.date === date);
                            return (
                              <div key={date} className="calendar-week-grid__daycol">
                                {timeLabels.map((label) => (
                                  <div key={label} className="calendar-day__row" />
                                ))}
                                {items.map((item) => {
                                  const [sh, sm] = item.start.split(':').map(Number);
                                  const [eh, em] = item.end.split(':').map(Number);
                                  const startMinutes = sh * 60 + sm;
                                  const endMinutes = eh * 60 + em;
                                  const duration = Math.max(endMinutes - startMinutes, 15);
                                  const top = (startMinutes / 60) * 48;
                                  const height = (duration / 60) * 48;
                                  const title = me?.role === 'ROLE_BUSINESS' ? item.customerName : item.businessName;
                                  return (
                                    <div
                                      key={item.id}
                                      className="calendar-day__event"
                                      style={{ top: `${top}px`, height: `${height}px` }}
                                    >
                                      <div className="calendar-day__event-title">{title}</div>
                                      <div className="calendar-day__event-sub">
                                        {item.service} · {item.start} - {item.end}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : null}

              {calendarView === 'month' ? (
                <div className={`p-4 calendar-month-grid ${isMobile ? 'calendar-month-grid--simple' : ''}`}>
                  <div className="calendar-month-grid__title">{currentMonthLabel}</div>
                  <div className="calendar-month-grid__header">
                    {weekDayLabels.map((label) => (
                      <div key={label} className="calendar-month-grid__head">
                        星期{label}
                      </div>
                    ))}
                  </div>
                  {monthDays.map((day) => {
                    const items = calendarItems
                      .filter((item) => item.date === day.dateStr)
                      .slice()
                      .sort((a, b) => a.start.localeCompare(b.start));
                    return (
                      <div
                        key={day.dateStr}
                        className={`calendar-month-grid__cell ${day.inMonth ? '' : 'is-muted'} ${
                          day.dateStr === today ? 'is-today' : ''
                        }`}
                      >
                        <div className="calendar-month-grid__date">{day.dateStr.split('-')[2]}</div>
                        {isMobile ? (
                          <div className="calendar-month-grid__dots">
                            {items.slice(0, 6).map((item) => (
                              <span key={item.id} className="calendar-month-grid__dot"></span>
                            ))}
                            {items.length > 6 ? <span className="calendar-month-grid__more">+{items.length - 6}</span> : null}
                          </div>
                        ) : (
                          <div className="calendar-month-grid__bars">
                            {items.length <= 3
                              ? items.map((item) => (
                                  <div key={item.id} className="calendar-month-grid__bar">
                                    {item.start} {item.service}
                                  </div>
                                ))
                              : (
                                <>
                                  {items.slice(0, 2).map((item) => (
                                    <div key={item.id} className="calendar-month-grid__bar">
                                      {item.start} {item.service}
                                    </div>
                                  ))}
                                  <div className="calendar-month-grid__more">+{items.length - 2}</div>
                                </>
                              )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {!me ? (
        <section className="container my-5">
          <div className="row g-4">
            <div className="col-md-4">
              <div className="card h-100 feature-card p-4">
                <div className="card-body text-center">
                  <div className="display-6 text-primary mb-3">📅</div>
                  <h3 className="card-title h5 fw-bold">快速預約</h3>
                  <p className="card-text text-muted">只需幾秒鐘，即可完成繁瑣的預約流程，提升工作效率。</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 feature-card p-4">
                <div className="card-body text-center">
                  <div className="display-6 text-success mb-3">🔔</div>
                  <h3 className="card-title h5 fw-bold">自動通知</h3>
                  <p className="card-text text-muted">系統自動發送提醒，降低爽約率，維持良好的服務品質。</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 feature-card p-4">
                <div className="card-body text-center">
                  <div className="display-6 text-info mb-3">📊</div>
                  <h3 className="card-title h5 fw-bold">數據分析</h3>
                  <p className="card-text text-muted">掌握預約趨勢，透過報表優化您的業務資源分配。</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {errorMessage ? <div className="visually-hidden">{errorMessage}</div> : null}
    </main>
  );
}
