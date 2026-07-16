import React, { useState } from 'react';
import {
  Home, PlayCircle, Calendar, Settings as SettingsIcon, LogOut, Users, Moon, Sun, Save, Mail, User, Lock, Folder, FolderOpen
} from 'lucide-react';
import './Settings.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Página Inicial', icon: Home },
  { id: 'replays', label: 'Replays', icon: PlayCircle },
  { id: 'agenda', label: 'Agenda da Arena', icon: Calendar },
  { id: 'times', label: 'Times', icon: Users },
];

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
          <SettingsIcon size={20} />
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

export default function Settings({ user, setUser, theme, setTheme, onNavigate, onLogout }) {
  const [formData, setFormData] = useState({
    nome: user?.nome || 'Usuário Teste',
    email: user?.email || 'usuario@teste.com',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [replayPath, setReplayPath] = useState(() => {
    return localStorage.getItem('sigafut_replay_path') || '/public/highlights';
  });
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if(setUser) {
      setUser({ ...user, nome: formData.nome, email: formData.email });
    }
    showMessage('Perfil atualizado com sucesso!');
  };

  const handleSavePassword = (e) => {
    e.preventDefault();
    if(formData.newPassword !== formData.confirmPassword) {
      showMessage('As novas senhas não coincidem!', 'error');
      return;
    }
    // Simulation of password change
    showMessage('Senha atualizada com sucesso!');
    setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
  };

  const handleSaveReplayPath = (e) => {
    e.preventDefault();
    localStorage.setItem('sigafut_replay_path', replayPath);
    showMessage('Diretório de replays atualizado com sucesso!');
  };

  const handleSelectFolder = async () => {
    try {
      if (window.showDirectoryPicker) {
        const directoryHandle = await window.showDirectoryPicker();
        // Em navegadores web, por segurança, só temos acesso ao nome da pasta e não ao caminho absoluto.
        // Se for um app desktop (Electron), teríamos o caminho real.
        setReplayPath(directoryHandle.name);
      } else {
        document.getElementById('folderInput').click();
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Erro ao selecionar pasta:', err);
      }
    }
  };

  const handleFolderInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const path = e.target.files[0].webkitRelativePath;
      const folderName = path.split('/')[0];
      setReplayPath(folderName);
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="settings-shell dashboard-shell">
      <Sidebar
        user={user}
        activePage="settings"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="dash-main">
        <header className="dash-topbar">
          <div className="topbar-left">
            <h1 className="page-title">Configurações</h1>
            <span className="page-date">Gerencie seu perfil e preferências</span>
          </div>
        </header>

        <section className="settings-content">
          {message && (
            <div className={`settings-message ${message.type}`}>
              {message.text}
            </div>
          )}

          <div className="settings-grid">
            {/* Preferences */}
            <div className="settings-card">
              <h2 className="settings-card-title">Preferências</h2>
              <div className="settings-form-group">
                <label>Tema da Interface</label>
                <div className="theme-toggle-wrapper">
                  <button 
                    className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => setTheme('light')}
                  >
                    <Sun size={20} />
                    Claro
                  </button>
                  <button 
                    className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => setTheme('dark')}
                  >
                    <Moon size={20} />
                    Escuro
                  </button>
                </div>
              </div>
            </div>

            {/* Storage */}
            <div className="settings-card">
              <h2 className="settings-card-title">Armazenamento</h2>
              <form onSubmit={handleSaveReplayPath} className="settings-form">
                <div className="settings-form-group">
                  <label>Pasta dos Replays</label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', marginTop: '-4px' }}>
                    Caminho do servidor onde os vídeos são salvos.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className="input-with-icon" style={{ flex: 1 }}>
                      <Folder size={18} />
                      <input 
                        type="text" 
                        value={replayPath}
                        onChange={(e) => setReplayPath(e.target.value)}
                        placeholder="/caminho/para/pasta"
                        required
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={handleSelectFolder}
                      className="theme-btn"
                      style={{ padding: '12px', border: '1px solid var(--border)' }}
                      title="Procurar pasta"
                    >
                      <FolderOpen size={18} />
                    </button>
                    <input 
                      type="file" 
                      id="folderInput" 
                      webkitdirectory="true" 
                      directory="true"
                      style={{ display: 'none' }}
                      onChange={handleFolderInput} 
                    />
                  </div>
                </div>
                <button type="submit" className="settings-submit-btn" style={{ marginTop: 'auto' }}>
                  <Save size={18} />
                  Salvar Caminho
                </button>
              </form>
            </div>

            {/* Profile Info */}
            <div className="settings-card">
              <h2 className="settings-card-title">Informações Pessoais</h2>
              <form onSubmit={handleSaveProfile} className="settings-form">
                <div className="settings-form-group">
                  <label>Nome de Usuário</label>
                  <div className="input-with-icon">
                    <User size={18} />
                    <input 
                      type="text" 
                      name="nome"
                      value={formData.nome}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="settings-form-group">
                  <label>E-mail</label>
                  <div className="input-with-icon">
                    <Mail size={18} />
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="settings-submit-btn">
                  <Save size={18} />
                  Salvar Perfil
                </button>
              </form>
            </div>

            {/* Password */}
            <div className="settings-card">
              <h2 className="settings-card-title">Alterar Senha</h2>
              <form onSubmit={handleSavePassword} className="settings-form">
                <div className="settings-form-group">
                  <label>Senha Atual</label>
                  <div className="input-with-icon">
                    <Lock size={18} />
                    <input 
                      type="password" 
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                <div className="settings-form-group">
                  <label>Nova Senha</label>
                  <div className="input-with-icon">
                    <Lock size={18} />
                    <input 
                      type="password" 
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                <div className="settings-form-group">
                  <label>Confirmar Nova Senha</label>
                  <div className="input-with-icon">
                    <Lock size={18} />
                    <input 
                      type="password" 
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="settings-submit-btn">
                  <Save size={18} />
                  Atualizar Senha
                </button>
              </form>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
