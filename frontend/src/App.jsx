import React, { useState, useEffect, useCallback } from "react";
import TelaLogin from "./components/TelaLogin.jsx";
import FormularioInsumo from "./components/FormularioInsumo.jsx";
import CardInsumo from "./components/CardInsumo.jsx";
import DetalheCard from "./components/DetalheCard.jsx";
import FiltroLocal from "./components/FiltroLocal.jsx";
import { Icon } from "./components/Icon.jsx";
import { COLUNAS } from "./constants.js";
import { obterUsuarioLogado, login, logout } from "./services/auth.js";
import { api, ErroApi } from "./services/api.js";
import "./estilos.css";

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [verificandoSessao, setVerificandoSessao] = useState(true);

  useEffect(() => {
    obterUsuarioLogado()
      .then(setUsuario)
      .finally(() => setVerificandoSessao(false));
  }, []);

  if (verificandoSessao) {
    return (
      <div className="tela-login">
        <p className="login-subtitulo">Verificando sessão…</p>
      </div>
    );
  }

  if (!usuario) {
    // login() redireciona a página inteira pra Microsoft — não retorna
    // nada aqui, a aba navega pra fora antes disso.
    return <TelaLogin onEntrar={login} />;
  }

  return (
    <QuadroPrincipal
      usuario={usuario}
      onSair={logout}
    />
  );
}

function QuadroPrincipal({ usuario, onSair }) {
  const [cards, setCards] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState("");

  const [formAberto, setFormAberto] = useState(false);
  const [cardSelecionado, setCardSelecionado] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroLocal, setFiltroLocal] = useState("");
  const [colunaArrastandoSobre, setColunaArrastandoSobre] = useState(null);

  const carregarCards = useCallback(() => {
    setCarregando(true);
    setErroCarregamento("");
    const params = {};
    if (filtroLocal) params.tipo_local = filtroLocal;
    if (busca.trim()) params.busca = busca.trim();

    api
      .listarInsumos(params)
      .then(setCards)
      .catch((err) => {
        setErroCarregamento(
          err instanceof ErroApi
            ? err.message
            : "Não foi possível conectar ao servidor. Verifique se o backend está rodando."
        );
      })
      .finally(() => setCarregando(false));
  }, [filtroLocal, busca]);

  useEffect(() => {
    carregarCards();
  }, [carregarCards]);

  const criarCard = async (dados) => {
    const novo = await api.criarInsumo(dados);
    setCards((prev) => [novo, ...prev]);
    setFormAberto(false);
  };

  const mudarColuna = async (id, coluna, motivoCancelamento) => {
    // atualização otimista — reflete na tela antes da resposta do servidor
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, coluna } : c)));
    setCardSelecionado((sel) => (sel && sel.id === id ? { ...sel, coluna } : sel));

    try {
      const atualizado = await api.mudarColuna(id, coluna, motivoCancelamento);
      setCards((prev) => prev.map((c) => (c.id === id ? atualizado : c)));
      setCardSelecionado((sel) => (sel && sel.id === id ? atualizado : sel));
    } catch (err) {
      // reverte em caso de falha
      carregarCards();
      alert(`Não foi possível mover o card: ${err.message}`);
    }
  };

  const mudarResponsavelChamado = async (id, responsavelChamado) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, responsavel_chamado: responsavelChamado } : c)));
    setCardSelecionado((sel) => (sel && sel.id === id ? { ...sel, responsavel_chamado: responsavelChamado } : sel));

    try {
      const atualizado = await api.mudarResponsavelChamado(id, responsavelChamado);
      setCards((prev) => prev.map((c) => (c.id === id ? atualizado : c)));
      setCardSelecionado((sel) => (sel && sel.id === id ? atualizado : sel));
    } catch (err) {
      carregarCards();
      alert(`Não foi possível atualizar o responsável: ${err.message}`);
    }
  };

  const excluirCard = async (id) => {
    try {
      await api.excluirInsumo(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
      setCardSelecionado(null);
    } catch (err) {
      alert(`Não foi possível excluir: ${err.message}`);
    }
  };

  const onArrastarInicio = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onSoltar = (e, colunaId) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) mudarColuna(id, colunaId);
    setColunaArrastandoSobre(null);
  };

  return (
    <div className="app">
      <header className="topo">
        <div className="topo-titulo">
          <span className="topo-icone-wrap">
            <Icon.Box className="topo-icone" />
          </span>
          <div>
            <h1>Cadastro de Insumos</h1>
            <p>Acompanhamento de solicitações em formato Kanban</p>
          </div>
        </div>

        <div className="topo-acoes">
          <FiltroLocal valor={filtroLocal} onMudar={setFiltroLocal} />

          <label className="campo-busca">
            <Icon.Search className="ic-pequeno" />
            <input
              type="text"
              placeholder="Buscar insumo, obra, solicitante…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>

          <button type="button" className="btn-primario btn-novo" onClick={() => setFormAberto(true)}>
            <Icon.Plus className="ic-pequeno" />
            Novo insumo
          </button>

          <div className="usuario-logado">
            <span className="avatar-mini avatar-usuario">{usuario.nome.charAt(0).toUpperCase()}</span>
            <span className="usuario-nome">{usuario.nome}</span>
            <button type="button" className="btn-icone" onClick={onSair} aria-label="Sair">
              <Icon.LogOut className="ic-pequeno" />
            </button>
          </div>
        </div>
      </header>

      {erroCarregamento && (
        <div className="faixa-erro">
          {erroCarregamento}
          <button type="button" className="link-tentar-novo" onClick={carregarCards}>
            Tentar novamente
          </button>
        </div>
      )}

      <main className="quadro">
        {COLUNAS.map((coluna) => {
          const itens = cards.filter((c) => c.coluna === coluna.id);
          return (
            <section
              key={coluna.id}
              className={`coluna ${colunaArrastandoSobre === coluna.id ? "arrastando-sobre" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setColunaArrastandoSobre(coluna.id);
              }}
              onDragLeave={() => setColunaArrastandoSobre((c) => (c === coluna.id ? null : c))}
              onDrop={(e) => onSoltar(e, coluna.id)}
            >
              <header className="coluna-header">
                <span className="coluna-marcador" style={{ "--cor": coluna.cor }} />
                <h2>{coluna.titulo}</h2>
                <span className="coluna-contagem">{itens.length}</span>
              </header>

              <div className="coluna-corpo">
                {carregando ? (
                  <div className="coluna-vazia">
                    <p>Carregando…</p>
                  </div>
                ) : itens.length === 0 ? (
                  <div className="coluna-vazia">
                    <Icon.Empty className="ic-vazia" />
                    <p>Nenhum insumo aqui</p>
                  </div>
                ) : (
                  itens.map((card) => (
                    <CardInsumo
                      key={card.id}
                      card={card}
                      onAbrir={setCardSelecionado}
                      onArrastarInicio={onArrastarInicio}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </main>

      <FormularioInsumo
        aberto={formAberto}
        usuario={usuario}
        onFechar={() => setFormAberto(false)}
        onCriar={criarCard}
      />

      <DetalheCard
        card={cardSelecionado}
        onFechar={() => setCardSelecionado(null)}
        onMudarColuna={mudarColuna}
        onMudarResponsavelChamado={mudarResponsavelChamado}
        onExcluir={excluirCard}
        buscarEventosEmail={api.listarEventosEmail}
      />
    </div>
  );
}
