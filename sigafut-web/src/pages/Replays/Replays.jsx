import React, { useState, useEffect } from 'react';
import {
  Home, PlayCircle, Calendar, Settings, Bell, HelpCircle,
  Search, SlidersHorizontal, LogOut, Download, Share2,
  Calendar as CalendarIcon, Clock, ChevronDown, X, Users, Info
} from 'lucide-react';
import './Replays.css';

// ───── Static Data ──────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Página Inicial', icon: Home },
  { id: 'replays', label: 'Replays', icon: PlayCircle },
  { id: 'agenda', label: 'Agenda da Arena', icon: Calendar },
  { id: 'times', label: 'Times', icon: Users },
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

// ───── Main Component ──────────────────────────────────────

export default function Replays({ user, onNavigate, onLogout, replays = [], initialReplay, onClearInitialReplay }) {
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeStats, setActiveStats] = useState(null);

  const handleWatch = (item) => {
    if (item.videoUrl) {
      setActiveVideo(item);
    } else {
      alert("Vídeo ainda não processado ou indisponível.");
    }
  };

  useEffect(() => {
    if (initialReplay) {
      const match = replays.find(r => r.id === initialReplay.id);
      if (match) {
        handleWatch(match);
      }
      onClearInitialReplay();
    }
  }, [initialReplay, replays, onClearInitialReplay]);

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
          {replays.map((item) => (
            <div key={item.id} className="gallery-card">
              {/* Top (Thumbnail) */}
              <div 
                className="card-thumb-wrap"
                onClick={() => handleWatch(item)}
                style={{ cursor: item.videoUrl ? 'pointer' : 'default' }}
              >
                <span className="card-badge">{item.badge}</span>
                {item.thumb ? (
                  <img src={item.thumb} alt={item.title} />
                ) : (
                  <video src={item.videoUrl} preload="metadata" className="card-video-preview" muted />
                )}
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
                
                {item.stats && (
                  <button 
                    className="btn-icon" 
                    onClick={() => setActiveStats(item)}
                    title="Informações do Confronto"
                    style={{ color: 'var(--accent-green)' }}
                  >
                    <Info size={18} />
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

      {/* Confrontation Stats Modal */}
      {activeStats && (
        <div className="stats-modal-overlay" onClick={() => setActiveStats(null)}>
          <div className="stats-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="stats-modal-header">
              <h2 className="stats-modal-title">Estatísticas do Confronto</h2>
              <button className="stats-modal-close" onClick={() => setActiveStats(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="stats-modal-body">
              {/* Scoreboard */}
              <div className="stats-scoreboard">
                <div className="scoreboard-team">
                  <div className="team-shield corinthians-shield">SCCP</div>
                  <span className="team-name">{activeStats.stats.homeTeam}</span>
                </div>
                
                <div className="scoreboard-score-wrap">
                  <span className="scoreboard-score">{activeStats.stats.homeScore}</span>
                  <span className="scoreboard-divider">-</span>
                  <span className="scoreboard-score">{activeStats.stats.awayScore}</span>
                </div>
                
                <div className="scoreboard-team">
                  <div className="team-shield sharks-shield">SF</div>
                  <span className="team-name">{activeStats.stats.awayTeam}</span>
                </div>
              </div>

              <div className="scoreboard-match-status">Fim de Jogo</div>

              {/* Stats Bars */}
              <div className="stats-details-list">
                {/* Gols Row */}
                <div className="stat-row">
                  <div className="stat-label-row">
                    <span className="stat-val-left">{activeStats.stats.homeScore}</span>
                    <span className="stat-name">Gols</span>
                    <span className="stat-val-right">{activeStats.stats.awayScore}</span>
                  </div>
                  <div className="stat-bar-container">
                    <div 
                      className="stat-bar-fill left" 
                      style={{ width: `${(activeStats.stats.homeScore / (activeStats.stats.homeScore + activeStats.stats.awayScore || 1)) * 100}%` }}
                    />
                    <div 
                      className="stat-bar-fill right" 
                      style={{ width: `${(activeStats.stats.awayScore / (activeStats.stats.homeScore + activeStats.stats.awayScore || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Passes Row */}
                <div className="stat-row">
                  <div className="stat-label-row">
                    <span className="stat-val-left">{activeStats.stats.homePasses}</span>
                    <span className="stat-name">Passes</span>
                    <span className="stat-val-right">{activeStats.stats.awayPasses}</span>
                  </div>
                  <div className="stat-bar-container">
                    <div 
                      className="stat-bar-fill left" 
                      style={{ width: `${(activeStats.stats.homePasses / (activeStats.stats.homePasses + activeStats.stats.awayPasses || 1)) * 100}%` }}
                    />
                    <div 
                      className="stat-bar-fill right" 
                      style={{ width: `${(activeStats.stats.awayPasses / (activeStats.stats.homePasses + activeStats.stats.awayPasses || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
