import React, { useState, useEffect } from 'react';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Replays from './pages/Replays/Replays';
import Schedule from './pages/Schedule/Schedule';
import Times from './pages/Times/Times';

function App() {
  const [currentPage, setCurrentPage] = useState('login'); // 'login' | 'register' | 'dashboard' | 'replays' | 'agenda' | 'times'
  const [user, setUser] = useState(null);

  // Lifted reservations state with localStorage persistence (starts empty as requested)
  const [reservations, setReservations] = useState(() => {
    const stored = localStorage.getItem('sigafut_reservations');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Clean up old legacy reservations without the date property
        return parsed.filter(res => res.date !== undefined);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Lifted courts state with localStorage persistence
  const [courts, setCourts] = useState(() => {
    const stored = localStorage.getItem('sigafut_courts');
    return stored ? JSON.parse(stored) : ['Campo 01', 'Campo 02', 'Campo Principal'];
  });

  // Lifted teams state with localStorage persistence
  const [teams, setTeams] = useState(() => {
    const stored = localStorage.getItem('sigafut_teams');
    return stored ? JSON.parse(stored) : [];
  });

  // Keep localStorage in sync with reservations changes
  useEffect(() => {
    localStorage.setItem('sigafut_reservations', JSON.stringify(reservations));
  }, [reservations]);

  // Keep localStorage in sync with courts changes
  useEffect(() => {
    localStorage.setItem('sigafut_courts', JSON.stringify(courts));
  }, [courts]);

  // Keep localStorage in sync with teams changes
  useEffect(() => {
    localStorage.setItem('sigafut_teams', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    const titles = {
      login: 'SIGAFUT - Login',
      register: 'SIGAFUT - Cadastro',
      dashboard: 'SIGAFUT - Dashboard',
      replays: 'SIGAFUT - Galeria de Replays',
      agenda: 'SIGAFUT - Agenda da Arena',
      times: 'SIGAFUT - Times'
    };
    document.title = titles[currentPage] || 'SIGAFUT';
  }, [currentPage]);

  if (currentPage === 'login') {
    return (
      <Login
        onLoginSuccess={(userData) => {
          setUser(userData);
          setCurrentPage('dashboard');
        }}
        onGoToRegister={() => setCurrentPage('register')}
      />
    );
  }

  if (currentPage === 'register') {
    return (
      <Register
        onRegisterSuccess={() => setCurrentPage('login')}
        onBackToLogin={() => setCurrentPage('login')}
      />
    );
  }

  if (currentPage === 'dashboard' || currentPage === 'home') {
    return (
      <Dashboard 
        user={user} 
        onNavigate={setCurrentPage}
        onLogout={() => {
          setUser(null);
          setCurrentPage('login');
        }} 
      />
    );
  }

  if (currentPage === 'replays') {
    return (
      <Replays 
        user={user} 
        onNavigate={setCurrentPage}
        onLogout={() => {
          setUser(null);
          setCurrentPage('login');
        }} 
      />
    );
  }

  if (currentPage === 'agenda') {
    return (
      <Schedule 
        user={user} 
        onNavigate={setCurrentPage}
        onLogout={() => {
          setUser(null);
          setCurrentPage('login');
        }} 
        reservations={reservations}
        setReservations={setReservations}
        courts={courts}
        setCourts={setCourts}
        teams={teams}
        setTeams={setTeams}
      />
    );
  }

  if (currentPage === 'times') {
    return (
      <Times 
        user={user} 
        onNavigate={setCurrentPage}
        onLogout={() => {
          setUser(null);
          setCurrentPage('login');
        }} 
        teams={teams}
        setTeams={setTeams}
      />
    );
  }

  return null;
}

export default App;
