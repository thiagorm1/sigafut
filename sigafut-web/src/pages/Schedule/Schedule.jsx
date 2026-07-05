import React from 'react';
import {
  Home, PlayCircle, Calendar, Settings, LogOut,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, UserCog
} from 'lucide-react';
import './Schedule.css';

// ───── Static Data ──────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Página Inicial', icon: Home },
  { id: 'replays', label: 'Replays', icon: PlayCircle },
  { id: 'agenda', label: 'Agenda da Arena', icon: Calendar },
];

const HOURS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00'
];

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Height of one hour block in pixels (must match CSS var --hour-height)
const HOUR_PX = 80;

// Helper to calculate top and height styles
const getEventStyle = (startHourIdx, durationHours) => ({
  top: `${startHourIdx * HOUR_PX}px`,
  height: `${durationHours * HOUR_PX - 4}px` // slightly smaller to leave gap
});

// ───── Sub-components ─────────────────────────────────────

function Sidebar({ user, activePage, onNavigate, onLogout }) {
  // As requested: Ricardo Souza / Gerente
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
            R
          </div>
          <div className="user-info">
            <span className="user-name">Ricardo Souza</span>
            <span className="user-role">Gerente</span>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ───── Main Component ──────────────────────────────────────

export default function Schedule({ user, onNavigate, onLogout }) {
  return (
    <div className="schedule-shell">
      <Sidebar
        user={user}
        activePage="agenda"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="schedule-main">
        {/* Topbar */}
        <header className="schedule-topbar">
          <div className="topbar-left">
            <h1 className="page-title">Agenda da Arena</h1>
            <p className="page-subtitle">Gestão de ocupação e reservas das quadras</p>
          </div>

          <div className="topbar-center">
            <button className="view-tab active">Semana</button>
            <button className="view-tab">Dia</button>
            <button className="view-tab">Mês</button>
          </div>

          <div className="topbar-right">
            <div className="date-nav">
              <button className="date-nav-btn"><ChevronLeft size={18} /></button>
              <div className="date-display">
                <CalendarIcon size={18} />
                <span>15 - 21 de Maio, 2024</span>
              </div>
              <button className="date-nav-btn"><ChevronRight size={18} /></button>
            </div>

            <button className="btn-new-reservation">
              <div className="btn-new-icon"><Plus size={20} /></div>
              <div className="btn-new-text">
                <span>Nova</span>
                <span>Reserva</span>
              </div>
            </button>
          </div>
        </header>

        {/* Calendar Grid Container */}
        <div className="calendar-container">
          
          {/* Calendar Header (Days) */}
          <div className="calendar-header">
            <div className="cal-header-cell time-col">Hora</div>
            {WEEK_DAYS.map(day => (
              <div key={day} className="cal-header-cell">{day}</div>
            ))}
          </div>

          {/* Calendar Body */}
          <div className="calendar-body">
            
            {/* Time Axis (Left Column) */}
            <div className="time-axis">
              {HOURS.map(hour => (
                <div key={hour} className="time-slot-label">{hour}</div>
              ))}
            </div>

            {/* Day Columns */}
            {WEEK_DAYS.map((day, dayIndex) => (
              <div key={day} className="day-col">
                
                {/* Horizontal grid lines for this column */}
                {HOURS.map((_, hIndex) => (
                  <div key={hIndex} className="grid-line" style={{ top: `${hIndex * HOUR_PX}px` }} />
                ))}

                {/* --- Events --- */}
                
                {/* Monday (Seg) */}
                {dayIndex === 0 && (
                  <>
                    <div className="event-card event-maintenance" style={getEventStyle(0, 1)}>
                      <div className="maintenance-badge">
                        <UserCog size={16} />
                        <span>MANUTENÇÃO</span>
                      </div>
                    </div>
                    
                    <div className="event-card event-green" style={getEventStyle(3, 1)}>
                      <h4 className="event-title">Inter Amigos</h4>
                      <p className="event-subtitle">Campo 01 • 10:00 - 11:00</p>
                    </div>
                  </>
                )}

                {/* Tuesday (Ter) */}
                {dayIndex === 1 && (
                  <div className="event-card event-green" style={getEventStyle(7, 1)}>
                    <h4 className="event-title">Escolinha SIGAFUT</h4>
                    <p className="event-subtitle">Campo 02 • 14:00 - 15:00</p>
                  </div>
                )}

                {/* Sunday (Dom) */}
                {dayIndex === 6 && (
                  <div className="event-card event-green" style={getEventStyle(2, 3)}>
                    <h4 className="event-title">Campeonato Regional - Sub 17</h4>
                    <p className="event-subtitle">Campo Principal • 09:00 - 12:00</p>
                  </div>
                )}

              </div>
            ))}

          </div>
        </div>

      </main>
    </div>
  );
}
