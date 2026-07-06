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

const SCHEDULE = {
  weekLabel: 'Maio 20–26',
  days: [
    { short: 'Seg', num: 22 },
    { short: 'Ter', num: 23 },
    { short: 'Qua', num: 24 },
  ],
  rows: [
    {
      hour: '18:00',
      cells: [
        { title: 'Inter Amigos', variant: 'green' },
        { title: 'Disponível', variant: 'empty' },
        { title: 'Treino Kids', variant: 'green' },
      ],
    },
    {
      hour: '19:00',
      cells: [
        { title: 'Reserva Manut.', variant: 'dark' },
        { title: 'Sócio Ouro', variant: 'green' },
        { title: 'Disponível', variant: 'empty' },
      ],
    },
    {
      hour: '20:00',
      cells: [
        { title: 'Disponível', variant: 'empty' },
        { title: 'Inter Amigos', variant: 'green' },
        { title: 'Reserva Manut.', variant: 'dark' },
      ],
    },
  ],
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
        <button className="nav-link settings-link">
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

function ArenaSchedule() {
  return (
    <div className="schedule-card">
      <div className="schedule-header">
        <h2 className="section-title">Agenda da Arena</h2>
        <div className="schedule-controls">
          <button className="schedule-nav-btn"><ChevronLeft size={16} /></button>
          <span className="schedule-week">{SCHEDULE.weekLabel}</span>
          <button className="schedule-nav-btn"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="schedule-table-wrap">
        <table className="schedule-table">
          <thead>
            <tr>
              <th className="col-hour">Hora</th>
              {SCHEDULE.days.map((d) => (
                <th key={d.num}>
                  {d.short} <span className="day-num">({d.num})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCHEDULE.rows.map((row) => (
              <tr key={row.hour}>
                <td className="cell-hour">{row.hour}</td>
                {row.cells.map((cell, ci) => (
                  <td key={ci} className="cell-slot">
                    <div className={`slot-block slot-${cell.variant}`}>
                      {cell.title}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="schedule-footer-link">
        Ver Agenda Completa <ArrowRight size={16} />
      </button>
    </div>
  );
}

function RecentReplays() {
  return (
    <div className="replays-card">
      <div className="replays-header">
        <h2 className="section-title">Últimos Replays</h2>
        <Clock size={18} className="replays-icon" />
      </div>

      <div className="replays-list">
        {REPLAYS.map((r) => (
          <div key={r.id} className="replay-item">
            <div className="replay-thumb">
              <img src={r.thumb} alt={r.title} />
              <span className="replay-duration">{r.duration}</span>
            </div>
            <div className="replay-meta">
              <span className="replay-title">{r.title}</span>
              <span className="replay-location">{r.location}</span>
            </div>
          </div>
        ))}
      </div>

      <button className="gallery-button">ACESSAR GALERIA</button>
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

export default function Dashboard({ user, onLogout, onNavigate }) {
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
            label="Reservas Ativas"
            value="24"
            badge="+12%"
            badgeType="badge-positive"
            footer="vs. semana passada"
          />
          <KpiCard
            icon={Video}
            iconBg="icon-blue"
            label="Novos Replays"
            value="158"
            badge="+5"
            badgeType="badge-positive"
            footer="últimos 7 dias"
          />
          <KpiCard
            icon={BarChart3}
            iconBg="icon-amber"
            label="Ocupação"
            value="Média"
            badge="82%"
            badgeType="badge-neutral"
          >
            <ProgressBar value={82} />
          </KpiCard>
          <CtaCard />
        </section>

        {/* Main Grid: Schedule + Right sidebar */}
        <section className="main-grid">
          <ArenaSchedule />

          <div className="right-sidebar">
            <RecentReplays />
            <WeatherWidget />
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
