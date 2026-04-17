import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useToast } from '../state/ToastContext.jsx';

export default function HomePage() {
  const { me } = useAuth();
  const { errorMessage, setErrorMessage } = useToast();
  const [dashboard, setDashboard] = useState(null);
  const [calendarView, setCalendarView] = useState('week');
  const [isMobile, setIsMobile] = useState(false);
  const [todayReservations, setTodayReservations] = useState([]);
  const [todayUsers, setTodayUsers] = useState([]);
  const [weekReservations, setWeekReservations] = useState([]);
  const [weekUsers, setWeekUsers] = useState([]);
  const [monthReservations, setMonthReservations] = useState([]);
  const [monthUsers, setMonthUsers] = useState([]);
  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // AuthProvider 已在全域載入 me，這裡不重複刷新以避免多次呼叫 /api/me

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
    void load();
  }, [me]);

  useEffect(() => {
    const loadTodayReservations = async () => {
      if (!me) {
        setTodayReservations([]);
        setTodayUsers([]);
        return;
      }
      try {
        const res = await api.todayReservations();
        const { reservations = []} = res?.data || {};
        const { userList = []} = res?.data || {};
        const items = reservations;
        const users = userList;
        setTodayReservations(Array.isArray(items) ? items : []);
        setTodayUsers(Array.isArray(users) ? users : []);
      } catch (err) {
        setErrorMessage(err.message || '載入今日預約失敗');
      }
    };
    void loadTodayReservations();
  }, [me, setErrorMessage]);

  useEffect(() => {
    const loadWeekReservations = async () => {
      if (!me) {
        setWeekReservations([]);
        setWeekUsers([]);
        return;
      }
      try {
        const res = await api.weekReservations();
        const { reservations = []} = res?.data || {};
        const { userList = []} = res?.data || {};
        const items = reservations;
        const users = userList;
        setWeekReservations(Array.isArray(items) ? items : []);
        setWeekUsers(Array.isArray(users) ? users : []);
      } catch (err) {
        setErrorMessage(err.message || '載入一週預約失敗');
      }
    };
    if (calendarView === 'week') {
      void loadWeekReservations();
    }
  }, [calendarView, me, setErrorMessage]);

  useEffect(() => {
    const loadMonthReservations = async () => {
      if (!me) {
        setMonthReservations([]);
        setMonthUsers([]);
        return;
      }
      try {
        const res = await api.monthReservations();
        const { reservations = []} = res?.data || {};
        const { userList = []} = res?.data || {};
        const items = reservations;
        const users = userList;
        setMonthReservations(Array.isArray(items) ? items : []);
        setMonthUsers(Array.isArray(users) ? users : []);
      } catch (err) {
        setErrorMessage(err.message || '載入一月預約失敗');
      }
    };
    if (calendarView === 'month') {
      void loadMonthReservations();
    }
  }, [calendarView, me, setErrorMessage]);

  useEffect(() => {
    const media = globalThis.matchMedia('(max-width: 768px)');
    const update = () => {
      const mobile = media.matches;
      setIsMobile(mobile);
      setCalendarView(mobile ? 'day' : 'month');
    };
    update();
    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    };
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const currentMonthLabel = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  }, []);

  const hslToHex = (h, s, l) => {
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const generatePalette = (count) => {
    const colors = [];
    const safeCount = Math.max(count, 1);
    const hueStart = 210;
    const hueEnd = 320;
    const saturation = 0.38;
    const lightness = 0.74;
    if (safeCount === 1) {
      const hue = (hueStart + hueEnd) / 2;
      return [hslToHex(hue, saturation, lightness)];
    }
    const step = (hueEnd - hueStart) / (safeCount - 1);
    for (let i = 0; i < safeCount; i += 1) {
      const hue = hueStart + step * i;
      colors.push(hslToHex(hue, saturation, lightness));
    }
    return colors;
  };

  const normalizeName = (value) => (value ? String(value).trim() : '');

  const getCustomerName = (item) =>
    item.username || item.userName || item.customerName || item.name || '';

  const getBusinessName = (item) =>
    item.businessName || item.business?.name || item.shopName || '';

  const getColorKey = (item, role) =>
    role === 'ROLE_BUSINESS' ? getCustomerName(item) : getBusinessName(item);

  const buildColorMap = (list, palette) => {
    const map = new Map();
    list.forEach((name, idx) => {
      const key = normalizeName(name);
      if (key && !map.has(key)) {
        map.set(key, palette[idx % palette.length]);
      }
    });
    return map;
  };

  const extractNames = (reservations, role) => {
    const list = reservations
      .map((item) => getColorKey(item, role))
      .filter(Boolean);
    return Array.from(new Set(list));
  };

  const effectiveTodayUsers = useMemo(() => {
    const extracted = extractNames(todayReservations, me?.role);
    return extracted.length ? extracted : todayUsers;
  }, [todayUsers, todayReservations, me]);
  const effectiveWeekUsers = useMemo(() => {
    const extracted = extractNames(weekReservations, me?.role);
    return extracted.length ? extracted : weekUsers;
  }, [weekUsers, weekReservations, me]);
  const effectiveMonthUsers = useMemo(() => {
    const extracted = extractNames(monthReservations, me?.role);
    return extracted.length ? extracted : monthUsers;
  }, [monthUsers, monthReservations, me]);

  const weekPalette = useMemo(() => generatePalette(effectiveWeekUsers.length || 1), [effectiveWeekUsers.length]);
  const monthPalette = useMemo(() => generatePalette(effectiveMonthUsers.length || 1), [effectiveMonthUsers.length]);
  const todayPalette = useMemo(() => generatePalette(effectiveTodayUsers.length || 1), [effectiveTodayUsers.length]);

  const weekColorMap = useMemo(() => buildColorMap(effectiveWeekUsers, weekPalette), [effectiveWeekUsers, weekPalette]);
  const monthColorMap = useMemo(() => buildColorMap(effectiveMonthUsers, monthPalette), [effectiveMonthUsers, monthPalette]);
  const todayColorMap = useMemo(() => buildColorMap(effectiveTodayUsers, todayPalette), [effectiveTodayUsers, todayPalette]);

  const calendarItems = useMemo(() => {
    if (calendarView === 'week') {
      return weekReservations.map((item, idx) => ({
        id: item.id ?? `week-${idx}`,
        date: item.reservationDate,
        start: item.startTime || item.start,
        end: item.endTime || item.end,
        service: item.title,
        customerName: getCustomerName(item),
        businessName: getBusinessName(item),
        isCompleted: item.status === 'COMPLETED',
        color: weekColorMap.get(normalizeName(getColorKey(item, me?.role))) || weekPalette[0]
      }));
    }
    if (calendarView === 'month') {
      return monthReservations.map((item, idx) => ({
        id: item.id ?? `month-${idx}`,
        date: item.reservationDate,
        start: item.startTime || item.start,
        end: item.endTime || item.end,
        service: item.title,
        customerName: getCustomerName(item),
        businessName: getBusinessName(item),
        isCompleted: item.status === 'COMPLETED',
        color: monthColorMap.get(normalizeName(getColorKey(item, me?.role))) || monthPalette[0]
      }));
    }
    return [];
  }, [calendarView, monthReservations, weekReservations, monthUsers, weekUsers, me, monthPalette, weekPalette]);

  const timeLabels = useMemo(
    () => Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
    []
  );

  const formatHM = (value) => {
    if (!value) return '';
    const parts = value.split(':');
    return parts.length >= 2 ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}` : value;
  };

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
        customerName: getCustomerName(item),
        businessName: getBusinessName(item),
        isCompleted: item.status === 'COMPLETED',
        color: todayColorMap.get(normalizeName(getColorKey(item, me?.role))) || todayPalette[0]
      };
      if (!mapped.start || !mapped.end) {
        return null;
      }
      const [sh, sm] = mapped.start.split(':').map(Number);
      const [eh, em] = mapped.end.split(':').map(Number);
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      const gap = 2;
      const duration = Math.max(endMinutes - startMinutes, 15);
      return {
        ...mapped,
        startMinutes,
        endMinutes,
        duration,
        topOffset: gap,
        heightOffset: gap * 2
      };
    }).filter(Boolean);
  }, [today, todayReservations, todayUsers, me]);
  useMemo(() => {
    return dayItems.reduce((acc, item) => {
      acc[item.date] = acc[item.date] || [];
      acc[item.date].push(item);
      return acc;
    }, {});
  }, [dayItems]);
  const isLoggedIn = Boolean(me);
  const isBusiness = me?.role === 'ROLE_BUSINESS';
  let heroContent;
  if (!isLoggedIn) {
    heroContent = (
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
    );
  } else if (isBusiness) {
    heroContent = (
      <div>
        <h1 className="display-4 fw-bold mb-3 text-white-strong">
          店長<span className="text-warning">{me.business?.name}</span>，你好！
        </h1>
        <p className="lead mb-4 text-white-strong">歡迎回來，這是您今日的營運概況。</p>
        <div className="row justify-content-center mt-4">
          <div className="col-md-10">
            <div className="card bg-white bg-opacity-10 border-0 shadow-lg text-white text-white-strong p-4 dashboard-card" style={{backdropFilter: 'blur(10px)'}}>
              <div className="row align-items-center">
                <Link to="/reservation/today/manage" className="col-sm-4 border-end border-white border-opacity-25 text-decoration-none text-white dashboard-card-link">
                  <h5 className="small text-uppercase opacity-75">今日預約</h5>
                  <p className="h2 mb-0">{dashboard?.todayCount ?? 0}</p>
                </Link>
                <Link to="/reservation/pending/manage" className="col-sm-4 border-end border-white border-opacity-25 text-decoration-none text-white dashboard-card-link">
                  <h5 className="small text-uppercase opacity-75">待處理預約</h5>
                  <p className="h2 mb-0">{dashboard?.pendingCount ?? 0}</p>
                </Link>
                <div className="col-sm-4">
                  <div className="d-grid gap-2">
                    <Link to="/business/info" className="btn btn-warning fw-bold shadow-sm no-text-shadow">
                      管理商家資訊
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
    );
  } else {
    heroContent = (
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
    );
  }
  let weekCalendarContent = null;
  const renderCalendarEvent = (item, top, height) => {
    const title = me?.role === 'ROLE_BUSINESS' ? item.customerName : item.businessName;
    return (
      <div key={item.id} className={`calendar-day__event${item.isCompleted ? ' calendar-event--completed' : ''}`} style={{ top: `${top}px`, height: `${height}px`, background: item.color, borderLeftColor: item.color }}>
        <div className="calendar-day__event-title">{title} · {item.service}</div>
        <div className="calendar-day__event-time">
          {formatHM(item.start)} - {formatHM(item.end)}
        </div>
      </div>
    );
  };

  if (calendarView === 'week') {
    weekCalendarContent = (
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
                const showNow = date === today;
                return (
                  <div key={date} className="calendar-week-grid__daycol">
                    {showNow
                      ? (<div className="calendar-now-line" style={{ top: `${(nowMinutes / 60) * 48 + 2}px` }}/>)
                      : null
                    }
                    {timeLabels.map((label) => (
                      <div key={label} className="calendar-day__row" />
                    ))}
                    {items.map((item) => {
                      const [sh, sm] = item.start.split(':').map(Number);
                      const [eh, em] = item.end.split(':').map(Number);
                      const startMinutes = sh * 60 + sm;
                      const endMinutes = eh * 60 + em;
                      const duration = Math.max(endMinutes - startMinutes, 15);
                      const top = (startMinutes / 60) * 48 + 2;
                      const height = (duration / 60) * 48 - 4;
                      return renderCalendarEvent(item, top, height);
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <main>
      <header className="hero-section text-center">
        <div className="container">
          {heroContent}
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
                  <button type="button" className={`btn btn-sm ${calendarView === 'day' ? 'btn-light text-primary fw-bold' : 'btn-outline-light'}`} onClick={() => setCalendarView('day')}>
                    日
                  </button>
                  <button type="button" className={`btn btn-sm ${calendarView === 'week' ? 'btn-light text-primary fw-bold' : 'btn-outline-light'}`} onClick={() => setCalendarView('week')}>
                    週
                  </button>
                  <button type="button" className={`btn btn-sm ${calendarView === 'month' ? 'btn-light text-primary fw-bold' : 'btn-outline-light'}`} onClick={() => setCalendarView('month')}>
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
                    <div className="calendar-now-line" style={{ top: `${48 + (nowMinutes / 60) * 48}px` }}/>
                    {timeLabels.map((label) => (
                      <div key={label} className="calendar-day__row" />
                    ))}
                    {dayItems.map((item) => {
                      const top = 48 + (item.startMinutes / 60) * 48 + (item.topOffset || 0);
                      const height = (item.duration / 60) * 48 - (item.heightOffset || 0);
                      return renderCalendarEvent(item, top, height);
                    })}
                  </div>
                </div>
              ) : null}

              {weekCalendarContent}

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
                      <div key={day.dateStr} className={`calendar-month-grid__cell ${day.inMonth ? '' : 'is-muted'} ${day.dateStr === today ? 'is-today' : ''}`}>
                        <div className="calendar-month-grid__date">{day.dateStr.split('-')[2]}</div>
                        {isMobile ? (
                          <div className="calendar-month-grid__dots">
                            {items.slice(0, 6).map((item) => (
                              <span key={item.id} className={`calendar-month-grid__dot${item.isCompleted ? ' calendar-event--completed' : ''}`} style={{ background: item.color }}></span>
                            ))}
                            {items.length > 6 ? <span className="calendar-month-grid__more">+{items.length - 6}</span> : null}
                          </div>
                        ) : (
                          <div className="calendar-month-grid__bars">
                            {items.length <= 3
                              ? items.map((item) => (
                                  <div key={item.id} className={`calendar-month-grid__bar${item.isCompleted ? ' calendar-event--completed' : ''}`} style={{ background: item.color }}>
                                  {formatHM(item.start)} {item.service}
                                  </div>
                                ))
                              : (
                                <>
                                  {items.slice(0, 2).map((item) => (
                                    <div key={item.id} className={`calendar-month-grid__bar${item.isCompleted ? ' calendar-event--completed' : ''}`} style={{ background: item.color }}>
                                    {formatHM(item.start)} {item.service}
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

      {isLoggedIn ?
        null : (
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
        )
      }
      {errorMessage ? <div className="visually-hidden">{errorMessage}</div> : null}
    </main>
  );
}
