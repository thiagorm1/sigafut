import React, { useState, useEffect } from 'react';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Replays from './pages/Replays/Replays';
import Schedule from './pages/Schedule/Schedule';

function App() {
  const [currentPage, setCurrentPage] = useState('login'); // 'login' | 'register' | 'dashboard' | 'replays' | 'agenda'
  const [user, setUser] = useState(null);

  useEffect(() => {
    const titles = {
      login: 'SIGAFUT - Login',
      register: 'SIGAFUT - Cadastro',
      dashboard: 'SIGAFUT - Dashboard',
      replays: 'SIGAFUT - Galeria de Replays',
      agenda: 'SIGAFUT - Agenda da Arena'
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
      />
    );
  }

  return null;
}

export default App;

