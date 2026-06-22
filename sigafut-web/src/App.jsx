import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Trophy, Shield, User, Clock, LogOut } from 'lucide-react';
import Login from './pages/Login/Login';

const socket = io('http://localhost:3000');

function App() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    socket.on('connect', () => {
      setConnected(true);
      console.log('Connected to SIGAFUT API');
    });

    socket.on('new_event', (data) => {
      console.log('New event received:', data);
      setEvents((prev) => [data, ...prev].slice(0, 10)); // Mantém os últimos 10
    });

    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.off('connect');
      socket.off('new_event');
      socket.off('disconnect');
    };
  }, []);

  useEffect(() => {
    document.title = isLoggedIn ? 'SIGAFUT - Dashboard' : 'SIGAFUT - Login';
  }, [isLoggedIn]);

  const getEventIcon = (type) => {
    switch (type) {
      case 'goal': return <Trophy className="text-yellow-500" />;
      case 'save': return <Shield className="text-blue-500" />;
      default: return <User className="text-gray-500" />;
    }
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <header className="mb-8 border-b border-gray-800 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            SIGAFUT <span className="text-blue-500">Live</span>
          </h1>
          <p className="text-gray-400 mt-1">Real-time Arena SIGAFUT Analytics & Highlights</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">{connected ? 'System Online' : 'Connecting...'}</span>
          </div>
          <button 
            onClick={() => setIsLoggedIn(false)} 
            className="flex items-center gap-2 px-3 py-1.5 bg-red-650 hover:bg-red-700 active:scale-95 text-white rounded text-xs font-semibold transition border border-red-700/50 cursor-pointer"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Clock size={20} className="text-blue-400" />
            Live Feed Metadata
          </h2>
          
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <p>Waiting for match events...</p>
                <button 
                  onClick={() => fetch('http://localhost:5000/api/cameras/start', { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({camera_id: 1, match_id: 1})
                  })}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Start Simulation
                </button>
              </div>
            ) : (
              events.map((event, idx) => (
                <div key={idx} className="bg-gray-750 p-4 rounded-lg border border-gray-700 flex items-center justify-between animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-700 p-2 rounded-full">
                      {getEventIcon(event.type)}
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-wide text-sm">{event.type}</p>
                      <p className="text-gray-400 text-xs">Player ID: {event.player_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-400 font-mono text-sm">{event.timestamp_match}</p>
                    <a href={event.video_highlight_url} target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 hover:underline">View Clip</a>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
          <h2 className="text-xl font-semibold mb-6">Match Stats</h2>
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-lg">
              <span className="text-gray-400">Total Goals</span>
              <span className="text-2xl font-bold text-yellow-500">
                {events.filter(e => e.type === 'goal').length}
              </span>
            </div>
            <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-lg">
              <span className="text-gray-400">Critical Saves</span>
              <span className="text-2xl font-bold text-blue-500">
                {events.filter(e => e.type === 'save').length}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
