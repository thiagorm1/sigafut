import React, { useState } from 'react';
import { User, Mail, Lock, AlertCircle, CheckCircle2, ArrowRight, ChevronLeft } from 'lucide-react';
import './Register.css';

export default function Register({ onRegisterSuccess, onBackToLogin }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [focusedField, setFocusedField] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validações no frontend
    if (!nome || !email || !senha || !confirmarSenha) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (nome.trim().length < 3) {
      setError('O nome deve ter pelo menos 3 caracteres.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }

    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), email: email.trim(), senha })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erro ao cadastrar. Tente novamente.');
        setIsLoading(false);
        return;
      }

      setSuccess('Conta criada com sucesso! Redirecionando para o login...');
      setTimeout(() => {
        onRegisterSuccess?.();
      }, 2000);
    } catch (err) {
      setError('Erro de conexão com o servidor. Verifique se a API está rodando.');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="register-page">
      <header className="register-header">
        <h1 className="brand-logo">SIGAFUT</h1>
      </header>

      <main className="register-main">
        <div className="register-card">
          <div className="card-top-accent"></div>

          <div className="card-header">
            <button
              type="button"
              className="back-link"
              onClick={onBackToLogin}
            >
              <ChevronLeft size={16} />
              Voltar para o login
            </button>
            <h2 className="register-title">Criar nova conta</h2>
            <p className="register-subtitle">Preencha os dados abaixo para se cadastrar no SIGAFUT</p>
          </div>

          <form className="register-form" onSubmit={handleSubmit} noValidate>
            {/* Nome */}
            <div className={`form-group ${focusedField === 'nome' ? 'focused' : ''}`}>
              <label htmlFor="register-nome" className="form-label">Nome completo</label>
              <div className="input-wrapper">
                <User className="input-icon" size={18} />
                <input
                  type="text"
                  id="register-nome"
                  className="form-input"
                  placeholder="Seu nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onFocus={() => setFocusedField('nome')}
                  onBlur={() => setFocusedField('')}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className={`form-group ${focusedField === 'email' ? 'focused' : ''}`}>
              <label htmlFor="register-email" className="form-label">Endereço de e-mail</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  id="register-email"
                  className="form-input"
                  placeholder="exemplo@sigafut.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField('')}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Senha */}
            <div className="form-row">
              <div className={`form-group ${focusedField === 'senha' ? 'focused' : ''}`}>
                <label htmlFor="register-senha" className="form-label">Senha</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    type="password"
                    id="register-senha"
                    className="form-input"
                    placeholder="Mínimo 6 caracteres"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    onFocus={() => setFocusedField('senha')}
                    onBlur={() => setFocusedField('')}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className={`form-group ${focusedField === 'confirmar' ? 'focused' : ''}`}>
                <label htmlFor="register-confirmar" className="form-label">Confirmar senha</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    type="password"
                    id="register-confirmar"
                    className="form-input"
                    placeholder="Repita a senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    onFocus={() => setFocusedField('confirmar')}
                    onBlur={() => setFocusedField('')}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password strength indicator */}
            {senha.length > 0 && (
              <div className="password-strength">
                <div className="strength-bars">
                  <div className={`strength-bar ${senha.length >= 1 ? (senha.length >= 8 ? 'strong' : senha.length >= 6 ? 'medium' : 'weak') : ''}`}></div>
                  <div className={`strength-bar ${senha.length >= 6 ? (senha.length >= 8 ? 'strong' : 'medium') : ''}`}></div>
                  <div className={`strength-bar ${senha.length >= 8 && /[A-Z]/.test(senha) && /[0-9]/.test(senha) ? 'strong' : ''}`}></div>
                </div>
                <span className="strength-text">
                  {senha.length < 6 ? 'Fraca' : senha.length < 8 ? 'Razoável' : /[A-Z]/.test(senha) && /[0-9]/.test(senha) ? 'Forte' : 'Razoável'}
                </span>
              </div>
            )}



            {/* Alerts */}
            {error && (
              <div className="alert-message error-alert" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert-message success-alert" role="alert">
                <CheckCircle2 size={16} />
                <span>{success}</span>
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="btn-submit" disabled={isLoading}>
              {isLoading ? (
                <span className="btn-loading-content">
                  <span className="spinner"></span>
                  Cadastrando...
                </span>
              ) : (
                <span className="btn-content">
                  Criar Conta
                  <ArrowRight size={18} className="btn-arrow" />
                </span>
              )}
            </button>
          </form>

          <div className="card-footer">
            <p className="login-prompt">
              Já possui uma conta?{' '}
              <button type="button" className="link-button" onClick={onBackToLogin}>
                Entrar no sistema
              </button>
            </p>
          </div>
        </div>
      </main>

      <footer className="register-footer">
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
