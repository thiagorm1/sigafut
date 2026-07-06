import React, { useState } from 'react';
import {
  Home, PlayCircle, Calendar, Settings, Search, Bell, HelpCircle,
  Plus, MoreVertical, User, Eye, Edit2, LogOut, Users, Grid, List, X, PlusCircle, Check
} from 'lucide-react';
import './Times.css';

// Helpers
function getFormattedDate() {
  const now = new Date();
  const formatted = now.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Página Inicial', icon: Home },
  { id: 'replays', label: 'Replays', icon: PlayCircle },
  { id: 'agenda', label: 'Agenda da Arena', icon: Calendar },
  { id: 'times', label: 'Times', icon: Users },
];

export default function Times({ user, onNavigate, onLogout, teams, setTeams }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    manager: '',
    players: 10,
    status: 'Ativo'
  });

  // Filtered teams
  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.manager.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculated metrics
  const totalPlayers = teams.reduce((acc, t) => acc + Number(t.players), 0);

  // Handle open add modal
  const handleOpenAdd = () => {
    setFormData({ name: '', manager: '', players: 10, status: 'Ativo' });
    setIsAddModalOpen(true);
  };

  // Handle submit add
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.manager) return;
    
    // Generate initials (first letter of first two words)
    const words = formData.name.trim().split(/\s+/);
    let initials = '';
    if (words.length >= 2) {
      initials = (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1) {
      initials = words[0].slice(0, 2).toUpperCase();
    } else {
      initials = 'TM';
    }

    const newTeam = {
      id: Date.now(),
      name: formData.name,
      initials,
      manager: formData.manager,
      players: Number(formData.players),
      status: formData.status
    };

    setTeams([...teams, newTeam]);
    setIsAddModalOpen(false);
  };

  // Handle open edit
  const handleOpenEdit = (team) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name,
      manager: team.manager,
      players: team.players,
      status: team.status
    });
    setIsEditModalOpen(true);
  };

  // Handle edit submit
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.manager) return;

    const words = formData.name.trim().split(/\s+/);
    let initials = '';
    if (words.length >= 2) {
      initials = (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1) {
      initials = words[0].slice(0, 2).toUpperCase();
    } else {
      initials = 'TM';
    }

    setTeams(teams.map(t => t.id === selectedTeam.id ? {
      ...t,
      name: formData.name,
      initials,
      manager: formData.manager,
      players: Number(formData.players),
      status: formData.status
    } : t));

    setIsEditModalOpen(false);
  };

  // Handle open view details
  const handleOpenView = (team) => {
    setSelectedTeam(team);
    setIsViewModalOpen(true);
  };

  return (
    <div className="times-shell">
      {/* Sidebar */}
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
                    className={`nav-link ${item.id === 'times' ? 'active' : ''}`}
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

      {/* Main Content Area */}
      <main className="times-main">
        {/* Topbar */}
        <header className="times-topbar">
          <div className="topbar-left">
            <h1 className="page-title">Times</h1>
            <span className="page-date">{getFormattedDate()}</span>
          </div>

          <div className="topbar-right">
            <div className="search-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Buscar times..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

        {/* Content Header (Subtext + Switcher + Add Button) */}
        <div className="times-content-header">
          <div className="subtitle-group">
            <p className="section-subtitle">
              Gerencie os clubes e agremiações registrados na arena.
            </p>
            <div className="teams-meta-stats">
              <span className="meta-stat-item"><strong>{teams.length}</strong> times</span>
              <span className="meta-stat-dot">•</span>
              <span className="meta-stat-item"><strong>{totalPlayers}</strong> jogadores no total</span>
            </div>
          </div>

          <div className="times-controls">
            {/* View Switcher */}
            <div className="view-switcher">
              <button 
                className={`switcher-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Visualização em Grade"
              >
                <Grid size={18} />
              </button>
              <button 
                className={`switcher-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Visualização em Lista"
              >
                <List size={18} />
              </button>
            </div>

            {/* Add Team Button */}
            <button className="btn-add-team" onClick={handleOpenAdd}>
              <PlusCircle size={20} />
              <span>Adicionar Novo Time</span>
            </button>
          </div>
        </div>

        {/* Core Content: Grid or List view */}
        {viewMode === 'grid' ? (
          <div className="teams-grid">
            {filteredTeams.map((team) => (
              <div key={team.id} className="team-card">
                {/* Accent Line is handled in CSS (border-left or pseudo-element) */}
                <div className="card-inner-header">
                  <div className="team-badge-circle">
                    {team.initials}
                  </div>
                  <div className="team-header-info">
                    <h3 className="team-card-title">{team.name}</h3>
                    <div className="team-card-manager">
                      <User size={14} />
                      <span>{team.manager}</span>
                    </div>
                  </div>
                  <button className="card-opt-btn" onClick={() => handleOpenEdit(team)}>
                    <MoreVertical size={16} />
                  </button>
                </div>

                <div className="card-stats-row">
                  <div className="stat-box">
                    <span className="stat-label">JOGADORES</span>
                    <span className="stat-val">{team.players}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">STATUS</span>
                    <span className={`stat-val status-${team.status.toLowerCase()}`}>
                      {team.status}
                    </span>
                  </div>
                </div>

                <div className="card-actions-row">
                  <button className="btn-card-edit" onClick={() => handleOpenEdit(team)}>
                    Editar
                  </button>
                  <button className="btn-card-view" onClick={() => handleOpenView(team)} title="Visualizar Detalhes">
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            ))}

            {/* Dash placeholder for new team */}
            <div className="team-card card-placeholder" onClick={handleOpenAdd}>
              <div className="placeholder-content">
                <div className="placeholder-icon-wrap">
                  <Plus size={28} />
                </div>
                <h4 className="placeholder-title">Novo Time</h4>
                <p className="placeholder-text">Clique para registrar uma nova equipe</p>
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="teams-list-wrap">
            <table className="teams-table">
              <thead>
                <tr>
                  <th>Iniciais</th>
                  <th>Nome do Time</th>
                  <th>Responsável</th>
                  <th>Jogadores</th>
                  <th>Status</th>
                  <th className="col-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team) => (
                  <tr key={team.id}>
                    <td>
                      <div className="table-badge">{team.initials}</div>
                    </td>
                    <td className="table-team-name">{team.name}</td>
                    <td>
                      <div className="table-manager">
                        <User size={14} />
                        <span>{team.manager}</span>
                      </div>
                    </td>
                    <td className="table-players">{team.players}</td>
                    <td>
                      <span className={`table-status status-${team.status.toLowerCase()}`}>
                        {team.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-table-action" onClick={() => handleOpenEdit(team)} title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-table-action" onClick={() => handleOpenView(team)} title="Visualizar">
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTeams.length === 0 && (
                  <tr>
                    <td colSpan="6" className="table-empty">
                      Nenhum time cadastrado ou encontrado na busca.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}



        {/* Footer */}
        <footer className="times-footer">
          <p>© 2024 SIGAFUT - Sistema de Gestão para Arenas de Futebol. Todos os direitos reservados.</p>
        </footer>
      </main>

      {/* --- Modals --- */}
      
      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Adicionar Novo Time</h3>
              <button className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="modal-form">
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome do Time</label>
                  <input
                    type="text"
                    required
                    className="modal-input"
                    placeholder="Ex: Inter Amigos FC"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nome do Responsável / Gerente</label>
                  <input
                    type="text"
                    required
                    className="modal-input"
                    placeholder="Ex: Carlos Alberto"
                    value={formData.manager}
                    onChange={(e) => setFormData({...formData, manager: e.target.value})}
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Número de Jogadores</label>
                    <input
                      type="number"
                      min="5"
                      max="40"
                      className="modal-input"
                      value={formData.players}
                      onChange={(e) => setFormData({...formData, players: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status Inicial</label>
                    <select
                      className="modal-select"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Pendente">Pendente</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={() => setIsAddModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-modal-submit">
                  Cadastrar Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Editar Time</h3>
              <button className="modal-close-btn" onClick={() => setIsEditModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-form">
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome do Time</label>
                  <input
                    type="text"
                    required
                    className="modal-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Responsável</label>
                  <input
                    type="text"
                    required
                    className="modal-input"
                    value={formData.manager}
                    onChange={(e) => setFormData({...formData, manager: e.target.value})}
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Jogadores</label>
                    <input
                      type="number"
                      min="5"
                      max="40"
                      className="modal-input"
                      value={formData.players}
                      onChange={(e) => setFormData({...formData, players: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="modal-select"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Pendente">Pendente</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={() => setIsEditModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-modal-submit">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {isViewModalOpen && selectedTeam && (
        <div className="modal-overlay" onClick={() => setIsViewModalOpen(false)}>
          <div className="modal-container view-details-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Detalhes da Equipe</h3>
              <button className="modal-close-btn" onClick={() => setIsViewModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body view-team-body">
              <div className="view-badge-large">{selectedTeam.initials}</div>
              <h2 className="view-team-title">{selectedTeam.name}</h2>
              <div className="view-details-grid">
                <div className="view-info-box">
                  <span className="info-lbl">Responsável Técnico</span>
                  <span className="info-val">{selectedTeam.manager}</span>
                </div>
                <div className="view-info-box">
                  <span className="info-lbl">Elenco Registrado</span>
                  <span className="info-val">{selectedTeam.players} Jogadores</span>
                </div>
                <div className="view-info-box">
                  <span className="info-lbl">Status na Arena</span>
                  <span className={`info-val status-${selectedTeam.status.toLowerCase()}`}>{selectedTeam.status}</span>
                </div>
                <div className="view-info-box">
                  <span className="info-lbl">Id da Equipe</span>
                  <span className="info-val">#{selectedTeam.id.toString().slice(-6)}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-modal-submit" onClick={() => setIsViewModalOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
