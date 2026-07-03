import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import './Login.css';

export default function Login({ onLoginSuccess, onGoToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve conter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha: password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erro ao fazer login. Tente novamente.');
        setIsLoading(false);
        return;
      }

      setSuccess('Autenticação bem-sucedida! Entrando no sistema...');
      setTimeout(() => {
        onLoginSuccess(data.user);
      }, 1200);
    } catch (err) {
      setError('Erro de conexão com o servidor. Verifique se a API está rodando.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setShowRecovery(true);
    setError('');
    setSuccess('');
  };

  const handleRecoverySubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!recoveryEmail) {
      setError('Por favor, insira seu e-mail.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recoveryEmail)) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }

    setIsLoading(true);

    // Simulate password recovery request
    setTimeout(() => {
      setIsLoading(false);
      setSuccess('Instruções de recuperação enviadas para o seu e-mail!');
      setTimeout(() => {
        setShowRecovery(false);
        setRecoveryEmail('');
        setSuccess('');
      }, 3000);
    }, 1500);
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <h1 className="brand-logo">SIGAFUT</h1>
      </header>

      <main className="login-main">
        <div className="login-card">
          <div className="card-top-border"></div>
          
          {!showRecovery ? (
            <>
              <div className="card-header">
                <h2 className="welcome-title">Bem-vindo ao SIGAFUT</h2>
                <p className="welcome-subtitle">Gerenciamento inteligente de arenas esportivas</p>
              </div>

              <form className="login-form" onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">Endereço de e-mail</label>
                  <div className="input-wrapper">
                    <Mail className="input-icon" size={18} />
                    <input
                      type="email"
                      id="email"
                      className="form-input"
                      placeholder="exemplo@sigafut.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="label-row">
                    <label htmlFor="password" className="form-label">Senha</label>
                    <a 
                      href="#recuperar" 
                      className="forgot-password-link" 
                      onClick={handleForgotPassword}
                    >
                      Esqueceu a senha?
                    </a>
                  </div>
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input
                      type="password"
                      id="password"
                      className="form-input"
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="alert-message error-alert">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="alert-message success-alert">
                    <CheckCircle2 size={16} />
                    <span>{success}</span>
                  </div>
                )}

                <button type="submit" className="btn-submit" disabled={isLoading}>
                  {isLoading ? (
                    <span className="btn-loading-content">
                      <span className="spinner"></span>
                      Autenticando...
                    </span>
                  ) : (
                    <span className="btn-content">
                      Entrar no Sistema
                      <ArrowRight size={18} className="btn-arrow" />
                    </span>
                  )}
                </button>
              </form>

              <div className="card-footer-register">
                <p className="register-prompt">
                  Não possui uma conta?{' '}
                  <button type="button" className="register-link-button" onClick={onGoToRegister}>
                    Criar conta
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="card-header">
                <h2 className="welcome-title">Recuperar Credenciais</h2>
                <p className="welcome-subtitle">Insira seu e-mail para receber as instruções de recuperação</p>
              </div>

              <form className="login-form" onSubmit={handleRecoverySubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="recoveryEmail" className="form-label">E-mail cadastrado</label>
                  <div className="input-wrapper">
                    <Mail className="input-icon" size={18} />
                    <input
                      type="email"
                      id="recoveryEmail"
                      className="form-input"
                      placeholder="exemplo@sigafut.com.br"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="alert-message error-alert">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="alert-message success-alert">
                    <CheckCircle2 size={16} />
                    <span>{success}</span>
                  </div>
                )}

                <div className="recovery-actions">
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => { setShowRecovery(false); setError(''); setSuccess(''); }}
                    disabled={isLoading}
                  >
                    Voltar para o login
                  </button>
                  <button type="submit" className="btn-submit" disabled={isLoading}>
                    {isLoading ? <span className="spinner"></span> : 'Enviar Instruções'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      <footer className="login-footer">
        <div className="footer-content">
          <span className="copyright">© 2026 SIGAFUT. Todos os direitos reservados.</span>
          <div className="footer-links">
            <a href="#privacidade" className="footer-link">Política de Privacidade</a>
            <span className="footer-divider">•</span>
            <a href="#termos" className="footer-link">Termos de Serviço</a>
            <span className="footer-divider">•</span>
            <a href="#ajuda" className="footer-link">Central de Ajuda</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
