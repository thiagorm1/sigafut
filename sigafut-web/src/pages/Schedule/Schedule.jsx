import React, { useState, useEffect } from 'react';
import {
  Home, PlayCircle, Calendar, Settings, LogOut,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, UserCog, Users, X
} from 'lucide-react';
import './Schedule.css';

// ───── Portuguese Helpers ────────────────────────────────────

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEK_DAYS_FULL = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const HOURS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00', '21:00',
  '22:00', '23:00', '00:00'
];

// Height of one hour block in pixels (must match CSS var --hour-height)
const HOUR_PX = 80;

// Helper to calculate top and height styles for time cards
const getEventStyle = (startHourIdx, durationHours) => ({
  top: `${startHourIdx * HOUR_PX}px`,
  height: `${durationHours * HOUR_PX - 4}px`
});

// Helper to format Date object into YYYY-MM-DD
const formatDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to get Monday of the week for a given Date
const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  // day is 0 for Sunday, 1 for Monday, etc.
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

// ───── Sidebar Component ───────────────────────────────────

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

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Página Inicial', icon: Home },
  { id: 'replays', label: 'Replays', icon: PlayCircle },
  { id: 'agenda', label: 'Agenda da Arena', icon: Calendar },
  { id: 'times', label: 'Times', icon: Users },
];

// ───── Main Schedule Page Component ────────────────────────

export default function Schedule({
  user,
  onNavigate,
  onLogout,
  reservations,
  setReservations,
  courts,
  setCourts,
  teams,
  setTeams,
  currentDate,
  setCurrentDate
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null); // reservation object being edited

  // View States: 'semana' (default), 'dia', 'mes'
  const [activeView, setActiveView] = useState('semana');

  // Active Court Navigation State
  const [activeCourt, setActiveCourt] = useState(() => {
    return courts.length > 0 ? courts[0] : 'Campo 01';
  });

  // Ensure active court is valid if courts list changes
  useEffect(() => {
    if (courts.length > 0 && !courts.includes(activeCourt)) {
      setActiveCourt(courts[0]);
    }
  }, [courts, activeCourt]);

  // Form states
  const [isRegisteredTeam, setIsRegisteredTeam] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [manualTeamName, setManualTeamName] = useState('');
  const [selectedCourt, setSelectedCourt] = useState('Campo 01');
  const [paymentStatus, setPaymentStatus] = useState('pago'); // 'pago' | 'sinal' | 'pendente' | 'maintenance'
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // Grid selection states (Modal Grid)
  const [selectedDay, setSelectedDay] = useState(null); // null or 0-6
  const [selectedHours, setSelectedHours] = useState([]); // array of indices

  // Auto-select the first registered team by default when list changes
  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id.toString());
    }
  }, [teams, selectedTeamId]);

  // Helper to check if a specific day and hour index is busy/reserved on the selected court
  const isSlotBusy = (dayIndex, hourIndex) => {
    // Determine the date string for this dayIndex relative to the active week
    const monday = getMonday(currentDate);
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + dayIndex);
    const dateStr = formatDateStr(dayDate);

    return reservations.some(res => {
      // Ignore the current editing reservation to allow modifications within its own slots
      if (editingReservation && res.id === editingReservation.id) return false;

      return res.court === selectedCourt &&
             res.date === dateStr &&
             hourIndex >= res.startHourIdx &&
             hourIndex < (res.startHourIdx + res.durationHours);
    });
  };

  // Helper to reset all form fields
  const resetForm = () => {
    setEditingReservation(null);
    setIsMaintenanceMode(false);
    setIsRegisteredTeam(false);
    setManualTeamName('');
    setSelectedDay(null);
    setSelectedHours([]);
    setSelectedCourt(activeCourt);
    setPaymentStatus('pago');
    if (teams.length > 0) {
      setSelectedTeamId(teams[0].id.toString());
    }
  };

  // Card click handler to edit reservation
  const handleEventClick = (res) => {
    setEditingReservation(res);

    // Navigate reference date to match the reservation week so the modal grid is synced
    if (res.date) {
      setCurrentDate(new Date(res.date + 'T00:00:00'));
    }

    if (res.status === 'maintenance') {
      setIsMaintenanceMode(true);
      setIsRegisteredTeam(false);
      setManualTeamName('');
    } else {
      setIsMaintenanceMode(false);
      // Check if title matches one of the registered teams
      const matchedTeam = teams.find(t => t.name.toLowerCase() === res.title.toLowerCase());
      if (matchedTeam) {
        setIsRegisteredTeam(true);
        setSelectedTeamId(matchedTeam.id.toString());
      } else {
        setIsRegisteredTeam(false);
        setManualTeamName(res.title);
      }
    }

    setSelectedCourt(res.court);
    setPaymentStatus(res.status);
    setSelectedDay(res.dayIndex);

    // Reconstruct selectedHours array
    const hoursRange = [];
    for (let i = 0; i < res.durationHours; i++) {
      hoursRange.push(res.startHourIdx + i);
    }
    setSelectedHours(hoursRange);
    setIsModalOpen(true);
  };

  // Delete Reservation handler
  const handleDeleteReservation = () => {
    if (window.confirm('Tem certeza que deseja excluir esta reserva?')) {
      setReservations(reservations.filter(r => r.id !== editingReservation.id));
      setIsModalOpen(false);
      resetForm();
    }
  };

  // Add Dynamic Court handler
  const handleAddCourt = () => {
    const courtName = prompt('Digite o nome da nova quadra/campo:');
    if (!courtName || courtName.trim() === '') return;

    const formatted = courtName.trim();
    if (courts.map(c => c.toLowerCase()).includes(formatted.toLowerCase())) {
      alert('Essa quadra já existe!');
      return;
    }

    setCourts([...courts, formatted]);
    setActiveCourt(formatted);
  };

  // Date Navigation handlers
  const handlePrev = () => {
    const nextDate = new Date(currentDate);
    if (activeView === 'dia') {
      nextDate.setDate(currentDate.getDate() - 1);
    } else if (activeView === 'semana') {
      nextDate.setDate(currentDate.getDate() - 7);
    } else if (activeView === 'mes') {
      nextDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(nextDate);
  };

  const handleNext = () => {
    const nextDate = new Date(currentDate);
    if (activeView === 'dia') {
      nextDate.setDate(currentDate.getDate() + 1);
    } else if (activeView === 'semana') {
      nextDate.setDate(currentDate.getDate() + 7);
    } else if (activeView === 'mes') {
      nextDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(nextDate);
  };

  // Date range display title formatting
  const getHeaderDateLabel = () => {
    if (activeView === 'dia') {
      const dayName = WEEK_DAYS_FULL[currentDate.getDay()];
      const dayNum = currentDate.getDate();
      const monthName = MONTHS_PT[currentDate.getMonth()];
      const year = currentDate.getFullYear();
      return `${dayName}, ${dayNum} de ${monthName} de ${year}`;
    }

    if (activeView === 'semana') {
      const monday = getMonday(currentDate);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const mDay = monday.getDate();
      const mMonth = MONTHS_PT[monday.getMonth()].slice(0, 3);
      const sDay = sunday.getDate();
      const sMonth = MONTHS_PT[sunday.getMonth()].slice(0, 3);
      const year = sunday.getFullYear();

      if (monday.getMonth() === sunday.getMonth()) {
        return `${mDay} - ${sDay} de ${MONTHS_PT[monday.getMonth()]}, ${year}`;
      } else {
        return `${mDay} de ${mMonth} - ${sDay} de ${sMonth}, ${year}`;
      }
    }

    if (activeView === 'mes') {
      const monthName = MONTHS_PT[currentDate.getMonth()];
      const year = currentDate.getFullYear();
      return `${monthName} de ${year}`;
    }

    return '';
  };

  // Grid Cell Click handler inside the Modal
  const handleCellClick = (dayIdx, hourIdx) => {
    // If the slot is already busy, ignore clicks
    if (isSlotBusy(dayIdx, hourIdx)) return;

    if (selectedDay !== dayIdx) {
      // Changed day: reset hours to only this clicked hour
      setSelectedDay(dayIdx);
      setSelectedHours([hourIdx]);
    } else {
      if (selectedHours.includes(hourIdx)) {
        if (selectedHours.length === 1) {
          // Deselect completely
          setSelectedDay(null);
          setSelectedHours([]);
        } else {
          // Remove clicked cell and sort
          const filtered = selectedHours.filter(h => h !== hourIdx);
          setSelectedHours(filtered.sort((a, b) => a - b));
        }
      } else {
        // Add clicked cell, sort, and fill the range in between
        const newHours = [...selectedHours, hourIdx].sort((a, b) => a - b);
        const min = newHours[0];
        const max = newHours[newHours.length - 1];
        
        // Safety check: check if any hour in the filled range is busy
        let hasConflict = false;
        const filled = [];
        for (let h = min; h <= max; h++) {
          if (isSlotBusy(dayIdx, h)) {
            hasConflict = true;
            break;
          }
          filled.push(h);
        }

        if (hasConflict) {
          setSelectedHours([hourIdx]);
        } else {
          setSelectedHours(filled);
        }
      }
    }
  };

  const handleCreateReservation = (e) => {
    e.preventDefault();

    if (selectedDay === null || selectedHours.length === 0) {
      alert('Por favor, selecione pelo menos um horário na grade do calendário.');
      return;
    }

    let title = '';
    if (isMaintenanceMode) {
      title = 'MANUTENÇÃO';
    } else if (isRegisteredTeam) {
      const teamObj = teams.find(t => t.id.toString() === selectedTeamId);
      title = teamObj ? teamObj.name : 'Time Cadastrado';
    } else {
      title = manualTeamName.trim() || 'Reserva Avulsa';
    }

    // Min hour index is the starting hour
    const startHourIdx = Math.min(...selectedHours);
    const durationHours = selectedHours.length;

    // Calculate exact date based on selectedDay relative to active week
    const monday = getMonday(currentDate);
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + selectedDay);
    const dateStr = formatDateStr(targetDate);

    if (editingReservation) {
      // Edit mode: Update existing reservation
      const updated = reservations.map(r => {
        if (r.id === editingReservation.id) {
          return {
            ...r,
            title: title,
            dayIndex: selectedDay,
            startHourIdx: startHourIdx,
            durationHours: durationHours,
            status: paymentStatus,
            court: selectedCourt,
            date: dateStr
          };
        }
        return r;
      });
      setReservations(updated);
    } else {
      // Create mode: Create new reservation
      const newRes = {
        id: Date.now(),
        title: title,
        dayIndex: selectedDay,
        startHourIdx: startHourIdx,
        durationHours: durationHours,
        status: paymentStatus,
        court: selectedCourt,
        date: dateStr
      };
      setReservations([...reservations, newRes]);
    }

    setIsModalOpen(false);
    resetForm();
  };

  // Month grid dates calculations
  const getMonthGridDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon, ...
    
    // Shift to find starting grid cell (Monday of grid start)
    const shift = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    const startGrid = new Date(firstDay);
    startGrid.setDate(firstDay.getDate() - shift);

    const cells = [];
    for (let i = 0; i < 42; i++) {
      cells.push(new Date(startGrid));
      startGrid.setDate(startGrid.getDate() + 1);
    }
    return cells;
  };

  // Reference variables for layout rendering
  const monday = getMonday(currentDate);
  const monthCells = activeView === 'mes' ? getMonthGridDays() : [];

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
            <button 
              className={`view-tab ${activeView === 'semana' ? 'active' : ''}`}
              onClick={() => setActiveView('semana')}
            >
              Semana
            </button>
            <button 
              className={`view-tab ${activeView === 'dia' ? 'active' : ''}`}
              onClick={() => setActiveView('dia')}
            >
              Dia
            </button>
            <button 
              className={`view-tab ${activeView === 'mes' ? 'active' : ''}`}
              onClick={() => setActiveView('mes')}
            >
              Mês
            </button>
          </div>

          <div className="topbar-right">
            <div className="date-nav">
              <button className="date-nav-btn" onClick={handlePrev}><ChevronLeft size={18} /></button>
              <div className="date-display">
                <CalendarIcon size={18} />
                <span>{getHeaderDateLabel()}</span>
              </div>
              <button className="date-nav-btn" onClick={handleNext}><ChevronRight size={18} /></button>
            </div>

            <button className="btn-new-reservation" onClick={() => { resetForm(); setSelectedCourt(activeCourt); setIsModalOpen(true); }}>
              <div className="btn-new-icon"><Plus size={20} /></div>
              <div className="btn-new-text">
                <span>Nova</span>
                <span>Reserva</span>
              </div>
            </button>
          </div>
        </header>

        {/* Dynamic Court Selector Tab Bar */}
        <div className="court-selector-bar">
          <div className="court-tabs">
            {courts.map(court => (
              <button
                key={court}
                className={`court-tab ${activeCourt === court ? 'active' : ''}`}
                onClick={() => setActiveCourt(court)}
              >
                <span>{court}</span>
              </button>
            ))}
          </div>
          <button className="btn-add-court" onClick={handleAddCourt}>
            <Plus size={16} />
            <span>Nova Quadra</span>
          </button>
        </div>

        {/* Calendar Grid Container depending on View Mode */}
        {activeView === 'mes' ? (
          // Monthly Grid View
          <div className="month-view-wrapper">
            <div className="month-grid-header">
              {WEEK_DAYS.map(day => (
                <div key={day} className="month-header-cell">{day}</div>
              ))}
            </div>
            
            <div className="month-grid-body">
              {monthCells.map((cellDate, idx) => {
                const cellDateStr = formatDateStr(cellDate);
                const isCurrentMonth = cellDate.getMonth() === currentDate.getMonth();
                const isToday = cellDate.toDateString() === new Date(2026, 6, 7).toDateString(); // locked to today 07-07-2026
                const cellReservations = reservations.filter(
                  res => res.date === cellDateStr && res.court === activeCourt
                );

                return (
                  <div 
                    key={idx} 
                    className={`month-cell ${isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''}`}
                    onClick={() => {
                      resetForm();
                      setSelectedCourt(activeCourt);
                      // Pre-select this cell date in grid selector
                      setCurrentDate(cellDate);
                      setSelectedDay(cellDate.getDay() === 0 ? 6 : cellDate.getDay() - 1);
                      setIsModalOpen(true);
                    }}
                  >
                    <div className="month-cell-header">
                      <span className="month-cell-day-num">{cellDate.getDate()}</span>
                    </div>

                    <div className="month-events-list">
                      {cellReservations.map(res => (
                        <div 
                          key={res.id} 
                          className={`month-event-item status-${res.status}`}
                          onClick={(e) => {
                            e.stopPropagation(); // prevent triggering parent cell click
                            handleEventClick(res);
                          }}
                          title={`${res.title} (${HOURS[res.startHourIdx]} - ${HOURS[res.startHourIdx + res.durationHours]})`}
                        >
                          <strong>{HOURS[res.startHourIdx]}</strong> {res.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        ) : (
          // Weekly / Daily Scrollable Columns Calendar Grid View
          <div className="calendar-container">
            
            {/* Calendar Header */}
            <div className="calendar-header">
              <div className="cal-header-cell time-col">Hora</div>
              {activeView === 'dia' ? (
                // Single day header
                <div className="cal-header-cell">
                  {WEEK_DAYS[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]} ({String(currentDate.getDate()).padStart(2, '0')}/{String(currentDate.getMonth() + 1).padStart(2, '0')})
                </div>
              ) : (
                // 7 days headers
                WEEK_DAYS.map((day, dayIndex) => {
                  const dayDate = new Date(monday);
                  dayDate.setDate(monday.getDate() + dayIndex);
                  return (
                    <div key={day} className="cal-header-cell">
                      {day} ({String(dayDate.getDate()).padStart(2, '0')}/{String(dayDate.getMonth() + 1).padStart(2, '0')})
                    </div>
                  );
                })
              )}
            </div>

            {/* Calendar Body */}
            <div className="calendar-body">
              
              {/* Time Axis (Left Column) */}
              <div className="time-axis">
                {HOURS.slice(0, -1).map(hour => (
                  <div key={hour} className="time-slot-label">{hour}</div>
                ))}
              </div>

              {activeView === 'dia' ? (
                // Single day column render
                (() => {
                  const dayDateStr = formatDateStr(currentDate);
                  const dayReservations = reservations.filter(
                    res => res.date === dayDateStr && res.court === activeCourt
                  );

                  return (
                    <div className="day-col single-day-view">
                      {HOURS.slice(0, -1).map((_, hIndex) => (
                        <div key={hIndex} className="grid-line" style={{ top: `${hIndex * HOUR_PX}px` }} />
                      ))}

                      {dayReservations.map(res => {
                        const isShort = res.durationHours === 1;
                        return (
                          <div 
                            key={res.id} 
                            className={`event-card status-${res.status} ${isShort ? 'short-card' : ''}`} 
                            style={getEventStyle(res.startHourIdx, res.durationHours)}
                            title={`${res.title} - Click para Editar`}
                            onClick={() => handleEventClick(res)}
                          >
                            <div className="event-card-content">
                              <h4 className="event-title">
                                {res.status === 'maintenance' ? '⚙️ MANUTENÇÃO' : res.title}
                              </h4>
                              <p className="event-subtitle">
                                {res.court} • {HOURS[res.startHourIdx]} - {HOURS[res.startHourIdx + res.durationHours]}
                                {isShort && ` • ${res.status === 'maintenance' ? 'Manutenção' : res.status === 'pago' ? 'Confirmado' : res.status === 'sinal' ? 'Sinal Pago' : 'Pendente'}`}
                              </p>
                              {!isShort && (
                                <span className={`status-pill badge-${res.status}`}>
                                  {res.status === 'maintenance' ? 'Bloqueado' : res.status === 'pago' ? 'Confirmado' : res.status === 'sinal' ? 'Sinal Pago' : 'Pendente'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()

              ) : (
                // 7 days columns render (Week View)
                WEEK_DAYS.map((day, dayIndex) => {
                  const dayDate = new Date(monday);
                  dayDate.setDate(monday.getDate() + dayIndex);
                  const dayDateStr = formatDateStr(dayDate);
                  
                  // Filter reservations for this column/day AND matching activeCourt
                  const dayReservations = reservations.filter(
                    res => res.date === dayDateStr && res.court === activeCourt
                  );

                  return (
                    <div key={day} className="day-col">
                      
                      {/* Horizontal grid lines for this column */}
                      {HOURS.slice(0, -1).map((_, hIndex) => (
                        <div key={hIndex} className="grid-line" style={{ top: `${hIndex * HOUR_PX}px` }} />
                      ))}

                      {/* --- Events --- */}
                      {dayReservations.map(res => {
                        const isShort = res.durationHours === 1;
                        return (
                          <div 
                            key={res.id} 
                            className={`event-card status-${res.status} ${isShort ? 'short-card' : ''}`} 
                            style={getEventStyle(res.startHourIdx, res.durationHours)}
                            title={`${res.title} - Click para Editar`}
                            onClick={() => handleEventClick(res)}
                          >
                            <div className="event-card-content">
                              <h4 className="event-title">
                                {res.status === 'maintenance' ? '⚙️ MANUTENÇÃO' : res.title}
                              </h4>
                              <p className="event-subtitle">
                                {res.court} • {HOURS[res.startHourIdx]} - {HOURS[res.startHourIdx + res.durationHours]}
                                {isShort && ` • ${res.status === 'maintenance' ? 'Manutenção' : res.status === 'pago' ? 'Confirmado' : res.status === 'sinal' ? 'Sinal Pago' : 'Pendente'}`}
                              </p>
                              {!isShort && (
                                <span className={`status-pill badge-${res.status}`}>
                                  {res.status === 'maintenance' ? 'Bloqueado' : res.status === 'pago' ? 'Confirmado' : res.status === 'sinal' ? 'Sinal Pago' : 'Pendente'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    </div>
                  );
                })
              )}

            </div>
          </div>
        )}

      </main>

      {/* --- Modal Nova / Editar Reserva --- */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsModalOpen(false); resetForm(); }}>
          <div className="modal-container large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingReservation ? 'Editar Reserva de Arena' : 'Nova Reserva de Arena'}
              </h3>
              <button className="modal-close-btn" onClick={() => { setIsModalOpen(false); resetForm(); }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateReservation} className="modal-form">
              <div className="modal-body scrollable-modal-body">
                
                {/* Checkboxes Row */}
                <div className="form-grid-2 header-checkboxes-grid">
                  <div className="form-group-checkbox">
                    <input
                      type="checkbox"
                      id="timeCadastrado"
                      className="modal-checkbox"
                      checked={isRegisteredTeam}
                      disabled={isMaintenanceMode}
                      onChange={(e) => setIsRegisteredTeam(e.target.checked)}
                    />
                    <label htmlFor="timeCadastrado" className={`checkbox-label ${isMaintenanceMode ? 'disabled-label' : ''}`}>
                      Time já cadastrado
                    </label>
                  </div>

                  <div className="form-group-checkbox">
                    <input
                      type="checkbox"
                      id="isMaintenance"
                      className="modal-checkbox"
                      checked={isMaintenanceMode}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsMaintenanceMode(checked);
                        if (checked) {
                          setPaymentStatus('maintenance');
                          setIsRegisteredTeam(false);
                        } else {
                          setPaymentStatus('pago');
                        }
                      }}
                    />
                    <label htmlFor="isMaintenance" className="checkbox-label">
                      Bloquear para Manutenção (Indisponibilizar)
                    </label>
                  </div>
                </div>

                {/* Row Grid: Court & Status */}
                <div className="form-grid-2 header-form-grid">
                  <div className="form-group">
                    <label className="form-label">Quadra / Campo</label>
                    <select
                      className="modal-select"
                      value={selectedCourt}
                      onChange={(e) => setSelectedCourt(e.target.value)}
                    >
                      {courts.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {!isMaintenanceMode && (
                    <div className="form-group">
                      <label className="form-label">Status do Pagamento</label>
                      <select
                        className="modal-select"
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value)}
                      >
                        <option value="pago">Confirmado e Pago</option>
                        <option value="sinal">Sinal Pago</option>
                        <option value="pendente">Pendente / Não Pago</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Conditional Field depending on checkboxes */}
                {isMaintenanceMode ? (
                  <div className="form-group maintenance-notice">
                    <p className="notice-text">
                      ⚙️ <strong>Atenção:</strong> Este período de horário será bloqueado no calendário para fins de manutenção e ficará indisponível para reservas de times.
                    </p>
                  </div>
                ) : isRegisteredTeam ? (
                  <div className="form-group">
                    <label className="form-label">Selecione o Time do Banco</label>
                    <select
                      className="modal-select"
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                    >
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                      {teams.length === 0 && (
                        <option value="">Carregando times...</option>
                      )}
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Nome do Time / Evento</label>
                    <input
                      type="text"
                      required
                      className="modal-input"
                      placeholder="Ex: Inter Amigos FC ou Treino Avulso"
                      value={manualTeamName}
                      onChange={(e) => setManualTeamName(e.target.value)}
                    />
                  </div>
                )}

                {/* INTERACTIVE CALENDAR GRID SELECTOR */}
                <div className="form-group">
                  <label className="form-label font-bold-label">
                    Selecione os Horários e Dias da Semana na Grade
                  </label>
                  {selectedDay !== null && selectedHours.length > 0 && (
                    <span className="selected-summary-text">
                      Selecionado: <strong>{WEEK_DAYS[selectedDay]}</strong> das{' '}
                      <strong>{HOURS[Math.min(...selectedHours)]}</strong> até{' '}
                      <strong>{HOURS[Math.max(...selectedHours) + 1]}</strong> ({selectedHours.length}h de duração)
                    </span>
                  )}

                  <div className="modal-grid-container">
                    <table className="modal-grid-selector">
                      <thead>
                        <tr>
                          <th className="hour-col-header">Hora</th>
                          {WEEK_DAYS.map((day, dayIndex) => {
                            const dayDate = new Date(monday);
                            dayDate.setDate(monday.getDate() + dayIndex);
                            return (
                              <th key={day} title={`${dayDate.toLocaleDateString('pt-BR')}`}>
                                {day} ({String(dayDate.getDate()).padStart(2, '0')})
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {HOURS.slice(0, -1).map((hour, hourIdx) => (
                          <tr key={hour}>
                            <td className="hour-label-cell">{hour}</td>
                            {WEEK_DAYS.map((_, dayIdx) => {
                              const isBusy = isSlotBusy(dayIdx, hourIdx);
                              const isSelected = selectedDay === dayIdx && selectedHours.includes(hourIdx);
                              return (
                                <td 
                                  key={dayIdx} 
                                  className={`grid-slot-cell ${isSelected ? 'selected' : ''} ${isBusy ? 'busy-slot' : ''}`}
                                  onClick={() => handleCellClick(dayIdx, hourIdx)}
                                  title={isBusy ? 'Horário Ocupado/Indisponível' : `Selecionar ${WEEK_DAYS[dayIdx]} às ${hour}`}
                                >
                                  {isBusy ? (
                                    <span className="cell-busy-label">🔒</span>
                                  ) : isSelected ? (
                                    <span className="cell-check">✓</span>
                                  ) : null}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              <div className="modal-footer">
                {editingReservation && (
                  <button type="button" className="btn-modal-delete" onClick={handleDeleteReservation}>
                    Excluir Reserva
                  </button>
                )}
                <div className="modal-footer-right">
                  <button type="button" className="btn-modal-cancel" onClick={() => { setIsModalOpen(false); resetForm(); }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-modal-submit">
                    {editingReservation ? 'Salvar Alterações' : 'Confirmar Reserva'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
