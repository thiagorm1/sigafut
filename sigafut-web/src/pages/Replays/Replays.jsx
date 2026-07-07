import React, { useState } from 'react';
import {
  Home, PlayCircle, Calendar, Settings, Bell, HelpCircle,
  Search, SlidersHorizontal, LogOut, Download, Share2,
  Calendar as CalendarIcon, Clock, ChevronDown, X
} from 'lucide-react';
import './Replays.css';

// ───── Static Data ──────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Página Inicial', icon: Home },
  { id: 'replays', label: 'Replays', icon: PlayCircle },
  { id: 'agenda', label: 'Agenda da Arena', icon: Calendar },
];

const REPLAYS_DATA = [
  {
    id: 1,
    badge: 'Campo 01',
    thumb: '/images/replay_card_1.jpg',
    time: '00:07',
    title: 'Gol de Futebol - Lance 1',
    date: 'Hoje',
    hour: '19:30',
    videoUrl: '/highlights/match_1_gol_1.mp4',
  },
  {
    id: 2,
    badge: 'Campo 01',
    thumb: '/images/replay_card_2.jpg',
    time: '00:07',
    title: 'Gol de Futebol - Lance 2',
    date: 'Hoje',
    hour: '19:35',
    videoUrl: '/highlights/match_1_gol_2.mp4',
  },
  {
    id: 3,
    badge: 'Campo 01',
    thumb: '/images/replay_card_3.jpg',
    time: '00:07',
    title: 'Gol de Futebol - Lance 3',
    date: 'Hoje',
    hour: '19:40',
    videoUrl: '/highlights/match_1_gol_3.mp4',
  },
  {
    id: 4,
    badge: 'Campo 01',
    thumb: '/images/replay_card_4.jpg',
    time: '00:07',
    title: 'Gol de Futebol - Lance 4',
    date: 'Hoje',
    hour: '19:45',
    videoUrl: '/highlights/match_1_gol_4.mp4',
  },
  {
    id: 5,
    badge: 'Campo 02',
    thumb: '/images/replay_card_5.jpg',
    time: '01:30:15',
    title: 'Treino Tático - Squad Alpha',
    date: '09 Jan 2024',
    hour: '08:30',
    videoUrl: null
  },
  {
    id: 6,
    badge: 'Campo 01',
    thumb: '/images/replay_card_6.jpg',
    time: '01:55:00',
    title: 'Galáticos vs. Real Madrid (Loc...)',
    date: '08 Jan 2024',
    hour: '22:00',
    videoUrl: null
  }
];

// ───── Sub-components ─────────────────────────────────────

function Sidebar({ user, activePage, onNavigate, onLogout }) {
  // O usuário pediu especificamente para usar os textos Admin Arena e Premium Account
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
            {user?.nome?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="user-info">
            <span className="user-name">Admin Arena</span>
            <span className="user-role">Premium Account</span>
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

export default function Replays({ user, onNavigate, onLogout }) {
  const [activeVideo, setActiveVideo] = useState(null);

  const handleWatch = (item) => {
    if (item.videoUrl) {
      setActiveVideo(item);
    } else {
      alert("Vídeo ainda não processado ou indisponível.");
    }
  };

  return (
    <div className="replays-shell">
      <Sidebar
        user={user}
        activePage="replays"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="replays-main">
        {/* Topbar */}
        <header className="replays-topbar">
          <div className="topbar-left">
            <h1 className="page-title">Galeria de Replays</h1>
          </div>

          <div className="topbar-right">
            <button className="topbar-icon-btn">
              <Bell size={22} />
              <span className="notif-dot" />
            </button>
            <button className="topbar-icon-btn">
              <HelpCircle size={22} />
            </button>
            
            <div className="topbar-divider" />
            
            <span className="arena-tag">Arena Central</span>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="filter-group">
            <span className="filter-label">Período</span>
            <div className="filter-input-wrap">
              <CalendarIcon size={18} className="filter-icon" />
              <input type="text" className="filter-input" placeholder="Selecione as datas" readOnly />
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">Campo</span>
            <div className="filter-input-wrap">
              <select className="filter-input filter-select">
                <option>Todos os Campos</option>
                <option>Campo 01</option>
                <option>Campo 02</option>
                <option>Campo 03</option>
              </select>
              <ChevronDown size={16} className="select-arrow" />
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">Pesquisar Partida ou Equipe</span>
            <div className="filter-input-wrap">
              <Search size={18} className="filter-icon" />
              <input type="text" className="filter-input" placeholder="Ex: Inter Amigos..." />
            </div>
          </div>

          <button className="btn-filter">
            <SlidersHorizontal size={18} />
            Filtrar
          </button>
        </div>

        {/* Grid de Replays */}
        <div className="replays-grid">
          {REPLAYS_DATA.map((item) => (
            <div key={item.id} className="gallery-card">
              {/* Top (Thumbnail) */}
              <div 
                className="card-thumb-wrap"
                onClick={() => handleWatch(item)}
                style={{ cursor: item.videoUrl ? 'pointer' : 'default' }}
              >
                <span className="card-badge">{item.badge}</span>
                <img src={item.thumb} alt={item.title} />
                <span className="card-time">{item.time}</span>
                
                {item.videoUrl && (
                  <div className="play-overlay">
                    <div className="play-btn">
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Middle (Metadata) */}
              <div className="card-content">
                <h3 className="card-title">{item.title}</h3>
                <div className="card-meta">
                  <div className="meta-item">
                    <CalendarIcon size={14} />
                    <span>{item.date}</span>
                  </div>
                  <div className="meta-item">
                    <Clock size={14} />
                    <span>{item.hour}</span>
                  </div>
                </div>
              </div>

              {/* Bottom (Actions) */}
              <div className="card-actions">
                <button 
                  className="btn-watch" 
                  onClick={() => handleWatch(item)}
                >
                  Assistir
                </button>
                {item.videoUrl ? (
                  <a 
                    href={item.videoUrl} 
                    download={`replay_${item.id}.mp4`} 
                    className="btn-icon" 
                    title="Baixar Replay"
                  >
                    <Download size={18} />
                  </a>
                ) : (
                  <button className="btn-icon" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    <Download size={18} />
                  </button>
                )}
                <button className="btn-icon" onClick={() => item.videoUrl && navigator.clipboard.writeText(window.location.origin + item.videoUrl).then(() => alert('Link copiado!'))}>
                  <Share2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Video Player Modal */}
      {activeVideo && (
        <div className="video-modal-overlay" onClick={() => setActiveVideo(null)}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <h2 className="video-modal-title">{activeVideo.title}</h2>
              <button className="video-modal-close" onClick={() => setActiveVideo(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="video-modal-body">
              <video 
                className="video-modal-player" 
                controls 
                autoPlay 
                src={activeVideo.videoUrl}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
