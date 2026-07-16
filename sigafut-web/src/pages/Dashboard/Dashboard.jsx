import React, { useState } from 'react';
import {
  Home, PlayCircle, Calendar, Settings, Search, Bell, HelpCircle,
  CalendarCheck, Video, Plus, ArrowRight, Clock,
  ChevronLeft, ChevronRight, LogOut, BarChart3, CloudSun, MapPin, Users
} from 'lucide-react';
import './Dashboard.css';

// ───── Helpers ─────────────────────────────────────────────

function getFormattedDate() {
  const now = new Date();
  const formatted = now.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// ───── Static Demo Data ───────────────────────────────────

const NAV_ITEMS = [
  { id: 'home', label: 'Página Inicial', icon: Home },
  { id: 'replays', label: 'Replays', icon: PlayCircle },
  { id: 'agenda', label: 'Agenda da Arena', icon: Calendar },
  { id: 'times', label: 'Times', icon: Users },
];

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const formatDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const REPLAYS = [
  {
    id: 1,
    title: 'Gol decisivo — Semi-final',
    location: 'Campo 01 • Há 15 min',
    duration: '01:45',
    thumb: '/images/replay1.jpg',
  },
  {
    id: 2,
    title: 'Defesa incrível — Goleiro',
    location: 'Campo 02 • Há 30 min',
    duration: '00:58',
    thumb: '/images/replay2.jpg',
  },
  {
    id: 3,
    title: 'Comemoração — Final',
    location: 'Campo 01 • Há 1h',
    duration: '02:12',
    thumb: '/images/replay3.jpg',
  },
];

// ───── Sub-components ─────────────────────────────────────

function Sidebar({ user, activePage, onNavigate, onLogout }) {
  return (
    <aside className="dash-sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <span className="brand-name">SIGAFUT</span>
          <span className="brand-sub">ARENA MANAGEMENT</span>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  className={`nav-link ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="sidebar-bottom">
        <button 
          className={`nav-link settings-link ${activePage === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          <Settings size={20} />
          <span>Configurações</span>
        </button>

        <div className="sidebar-divider" />

        <div className="user-profile">
          <div className="user-avatar">
            {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.nome || 'Usuário'}</span>
            <span className="user-role">
              {user?.role === 'admin'
                ? 'Admin Principal'
                : user?.role === 'operador'
                  ? 'Operador'
                  : 'Cliente'}
            </span>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function KpiCard({ icon: Icon, iconBg, label, value, badge, badgeType, footer, children }) {
  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <div className={`kpi-icon-wrap ${iconBg}`}>
          <Icon size={20} />
        </div>
        {badge && <span className={`kpi-badge ${badgeType}`}>{badge}</span>}
      </div>
      <div className="kpi-body">
        <span className="kpi-label">{label}</span>
        <span className="kpi-value">{value}</span>
      </div>
      {footer && <div className="kpi-footer">{footer}</div>}
      {children}
    </div>
  );
}

function CtaCard() {
  return (
    <div className="kpi-card cta-card">
      <div className="cta-content">
        <h3 className="cta-title">Nova Arena?</h3>
        <p className="cta-text">
          Configure uma nova arena e comece a gerenciar reservas e replays agora mesmo.
        </p>
        <button className="cta-button">Configurar Arena</button>
      </div>
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="progress-bar-track">
      <div className="progress-bar-fill" style={{ width: `${value}%` }} />
    </div>
  );
}

function ArenaSchedule({ onNavigate, reservations = [], currentDate }) {
  const refDate = currentDate || new Date(2026, 6, 7);
  const monday = getMonday(refDate);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const mDay = monday.getDate();
  const mMonth = MONTHS_PT[monday.getMonth()].slice(0, 3);
  const sDay = sunday.getDate();
  const sMonth = MONTHS_PT[sunday.getMonth()].slice(0, 3);
  const year = monday.getFullYear();
  const weekLabel = monday.getMonth() === sunday.getMonth()
    ? `${mDay} - ${sDay} de ${MONTHS_PT[monday.getMonth()]}, ${year}`
    : `${mDay} de ${mMonth} - ${sDay} de ${sMonth}, ${year}`;

  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((short, index) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + index);
    return {
      short,
      num: dayDate.getDate(),
      dateStr: formatDateStr(dayDate),
    };
  });

  const rows = [
    { hour: '07:00', idx: 0 },
    { hour: '08:00', idx: 1 },
    { hour: '09:00', idx: 2 },
    { hour: '10:00', idx: 3 },
    { hour: '11:00', idx: 4 },
    { hour: '12:00', idx: 5 },
    { hour: '13:00', idx: 6 },
    { hour: '14:00', idx: 7 },
    { hour: '15:00', idx: 8 },
    { hour: '16:00', idx: 9 },
    { hour: '17:00', idx: 10 },
    { hour: '18:00', idx: 11 },
    { hour: '19:00', idx: 12 },
    { hour: '20:00', idx: 13 },
    { hour: '21:00', idx: 14 },
    { hour: '22:00', idx: 15 },
  ];

  return (
    <div className="schedule-card">
      <div style={{ pointerEvents: 'none', opacity: 0.95 }}>
        <div className="schedule-header">
          <h2 className="section-title">Agenda da Arena</h2>
          <div className="schedule-controls">
            <button className="schedule-nav-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              <ChevronLeft size={16} />
            </button>
            <span className="schedule-week">{weekLabel}</span>
            <button className="schedule-nav-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="schedule-table-wrap">
          <table className="schedule-table">
            <thead>
              <tr>
                <th className="col-hour">Hora</th>
                {days.map((d) => (
                  <th key={d.num}>
                    {d.short} <span className="day-num">({d.num})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.hour}>
                  <td className="cell-hour">{row.hour}</td>
                  {days.map((day, di) => {
                    const reservation = reservations.find(
                      (res) =>
                        res.date === day.dateStr &&
                        res.startHourIdx <= row.idx &&
                        row.idx < res.startHourIdx + res.durationHours
                    );

                    let title = 'Disponível';
                    let variant = 'empty';

                    if (reservation) {
                      title = reservation.status === 'maintenance' ? 'Manutenção' : reservation.title;
                      variant = reservation.status === 'maintenance' ? 'dark' : 'green';
                    }

                    return (
                      <td key={di} className="cell-slot">
                        <div className={`slot-block slot-${variant}`}>
                          {title}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button className="schedule-footer-link" onClick={() => onNavigate('agenda')}>
        Ver Agenda Completa <ArrowRight size={16} />
      </button>
    </div>
  );
}

function RecentReplays({ replays = [], onNavigate, onWatchReplay }) {
  return (
    <div className="replays-card">
      <div className="replays-header">
        <h2 className="section-title">Últimos Replays</h2>
        <Clock size={18} className="replays-icon" />
      </div>

      <div className="replays-list">
        {replays.map((r) => (
          <div 
            key={r.id} 
            className="replay-item" 
            onClick={() => onWatchReplay && onWatchReplay(r)}
            style={{ cursor: 'pointer' }}
          >
            <div className="replay-thumb">
              {r.thumb ? (
                <img src={r.thumb} alt={r.title} />
              ) : (
                <video src={r.videoUrl} preload="metadata" muted />
              )}
              <span className="replay-duration">{r.time || r.duration}</span>
            </div>
            <div className="replay-meta">
              <span className="replay-title">{r.title}</span>
              <span className="replay-location">{r.badge || r.location}</span>
            </div>
          </div>
        ))}
      </div>

      <button className="gallery-button" onClick={() => onNavigate('replays')}>
        ACESSAR GALERIA
      </button>
    </div>
  );
}

function WeatherWidget() {
  return (
    <div className="weather-card">
      <div className="weather-main">
        <CloudSun size={32} className="weather-icon" />
        <div className="weather-info">
          <span className="weather-temp">24°C</span>
          <span className="weather-desc">Parcialmente nublado</span>
        </div>
      </div>
      <div className="weather-location">
        <MapPin size={14} />
        <span>Arena SIGAFUT</span>
      </div>
    </div>
  );
}

// ───── Main Dashboard ─────────────────────────────────────

export default function Dashboard({ user, onLogout, onNavigate, reservations = [], currentDate, replays = [], onWatchReplay, teams = [] }) {
  const totalTeamsCount = teams.length;
  const refDate = currentDate || new Date(2026, 6, 7);
  const mon = getMonday(refDate);
  const weekDateStrings = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return formatDateStr(d);
  });

  const weeklyReservationsCount = reservations.filter(res => weekDateStrings.includes(res.date)).length;
  const weeklyReplaysCount = replays.filter(rep => rep.date === 'Hoje' || weekDateStrings.includes(rep.date)).length;

  return (
    <div className="dashboard-shell">
      <Sidebar
        user={user}
        activePage="home"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="dash-main">
        {/* Topbar */}
        <header className="dash-topbar">
          <div className="topbar-left">
            <h1 className="page-title">Painel Geral</h1>
            <span className="page-date">{getFormattedDate()}</span>
          </div>

          <div className="topbar-right">
            <div className="search-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Buscar reserva ou replay..."
              />
            </div>
            <button className="topbar-icon-btn">
              <Bell size={20} />
              <span className="notif-dot" />
            </button>
            <button className="topbar-icon-btn">
              <HelpCircle size={20} />
            </button>
          </div>
        </header>

        {/* KPI Row */}
        <section className="kpi-grid">
          <KpiCard
            icon={CalendarCheck}
            iconBg="icon-green"
            label="Reservas da Semana"
            value={weeklyReservationsCount.toString()}
            badge={weeklyReservationsCount > 0 ? `+${weeklyReservationsCount}` : "0"}
            badgeType="badge-positive"
            footer="nesta semana"
          />
          <KpiCard
            icon={Video}
            iconBg="icon-blue"
            label="Novos Replays"
            value={weeklyReplaysCount.toString()}
            badge={weeklyReplaysCount > 0 ? `+${weeklyReplaysCount}` : "0"}
            badgeType="badge-positive"
            footer="nesta semana"
          />
          <KpiCard
            icon={Users}
            iconBg="icon-amber"
            label="Times Cadastrados"
            value={totalTeamsCount.toString()}
            badge={totalTeamsCount > 0 ? `+${totalTeamsCount}` : "0"}
            badgeType="badge-positive"
            footer="no total"
          />
        </section>

        {/* Main Grid: Schedule + Right sidebar */}
        <section className="main-grid">
          <ArenaSchedule onNavigate={onNavigate} reservations={reservations} currentDate={currentDate} />

          <div className="right-sidebar">
            <RecentReplays replays={replays} onNavigate={onNavigate} onWatchReplay={onWatchReplay} />
          </div>
        </section>
      </main>

      {/* FAB */}
      <button className="fab" title="Nova Reserva">
        <Plus size={24} />
      </button>
    </div>
  );
}
