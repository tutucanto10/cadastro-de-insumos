import React, { useState } from "react";

export default function TelaLogin({ onEntrar }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");

  const submeter = (e) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      setErro("Preencha nome e email pra continuar.");
      return;
    }
    if (!email.includes("@")) {
      setErro("Informe um email válido.");
      return;
    }
    onEntrar({ nome, email });
  };

  return (
    <div className="tela-login">
      <div className="login-card">
        <div className="login-icone">
          <svg viewBox="0 0 23 23" width="26" height="26">
            <rect x="1" y="1" width="10" height="10" fill="#f25022" />
            <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
            <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
            <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
          </svg>
        </div>

        <h1>Cadastro de Insumos</h1>
        <p className="login-subtitulo">
          Entre com sua conta Microsoft 365 da DOMMA
        </p>

        <div className="aviso-mock">
          Login simulado — a integração real com Azure AD ainda será conectada.
        </div>

        <form onSubmit={submeter} className="login-form">
          <label className="campo">
            <span className="campo-label">Nome</span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              autoFocus
            />
          </label>

          <label className="campo">
            <span className="campo-label">Email corporativo</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@dommainc.com.br"
            />
          </label>

          {erro && <span className="campo-erro">{erro}</span>}

          <button type="submit" className="btn-primario btn-login">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
