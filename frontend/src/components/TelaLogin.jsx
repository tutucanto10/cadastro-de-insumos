import React, { useState } from "react";

export default function TelaLogin({ onEntrar }) {
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState("");

  const entrar = async () => {
    setEntrando(true);
    setErro("");
    try {
      await onEntrar();
    } catch (err) {
      setErro(err?.message || "Não foi possível entrar. Tente novamente.");
    } finally {
      setEntrando(false);
    }
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

        {erro && <span className="campo-erro">{erro}</span>}

        <button type="button" className="btn-primario btn-login" onClick={entrar} disabled={entrando}>
          {entrando ? "Entrando…" : "Entrar com Microsoft"}
        </button>
      </div>
    </div>
  );
}
