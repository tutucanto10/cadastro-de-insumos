import React, { useState, useEffect, useCallback } from "react";

// ---------------------------------------------
// Dados fixos
// ---------------------------------------------

const OBRAS = [
  "Unic São Gonçalo",
  "LIV Primavera",
  "Unic Primavera",
  "Reserva Equitativa",
  "PRIME Caxias",
  "Seleto Inhaúma",
  "Seleto Primavera",
];

const COLUNAS = [
  { id: "a-fazer", titulo: "A Fazer", cor: "#2563eb" },
  { id: "em-andamento", titulo: "Em Andamento", cor: "#d97706" },
  { id: "concluido", titulo: "Concluído", cor: "#059669" },
];

const STORAGE_KEY = "cadastro-insumos:cards";

const gerarId = () =>
  `INS-${Date.now().toString(36).toUpperCase()}-${Math.floor(
    Math.random() * 900 + 100
  )}`;

const hojeISO = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

const formatarDataBR = (iso) => {
  if (!iso) return "--";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
};

// ---------------------------------------------
// Persistência (localStorage)
// ---------------------------------------------

function carregarCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function salvarCards(cards) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch {
    // localStorage indisponível (modo privado, quota etc.) — segue só em memória
  }
}

// ---------------------------------------------
// Ícones (inline SVG, sem dependência externa)
// ---------------------------------------------

const Icon = {
  Plus: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  Close: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  Chevron: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Back: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path d="M12.5 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Box: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path
        d="M10 2.5l7 3.6v7.8l-7 3.6-7-3.6V6.1l7-3.6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M3 6.1L10 9.7m0 0l7-3.6M10 9.7V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  Tag: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path
        d="M3 3h6.5L17 10.5 10.5 17 3 9.5V3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="6.5" cy="6.5" r="1.1" fill="currentColor" />
    </svg>
  ),
  Building: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path d="M4 17V4.5L10 2l6 2.5V17" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M2 17h16M7.5 7h1.5M11 7h1.5M7.5 10.5h1.5M11 10.5h1.5M7.5 14h1.5M11 14h1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  User: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <circle cx="10" cy="6.8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 17c1-3.5 4-5 6.5-5s5.5 1.5 6.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Calendar: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <rect x="3" y="4.3" width="14" height="12.2" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8h14M6.5 2.5v3M13.5 2.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Search: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <circle cx="8.7" cy="8.7" r="5.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16.3 16.3l-3.4-3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Trash: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path d="M4 5.5h12M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5M6 5.5l.7 10.2A1.5 1.5 0 008.2 17h3.6a1.5 1.5 0 001.5-1.3L14 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Empty: (p) => (
    <svg viewBox="0 0 64 40" fill="none" {...p}>
      <rect x="10" y="14" width="44" height="20" rx="2.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M22 24h20M22 29h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M27 14V9.5a1.5 1.5 0 011.5-1.5h7a1.5 1.5 0 011.5 1.5V14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

// ---------------------------------------------
// Etapas do formulário (Local ramifica em duas telas)
// ---------------------------------------------

const ETAPA = { LOCAL_TIPO: "local-tipo", LOCAL_OBRA: "local-obra", DETALHES: "detalhes" };

const FORM_VAZIO = {
  nomeInsumo: "",
  unidadeMedida: "",
  tipoLocal: "", // "escritorio" | "obra"
  obraEscolhida: "",
  detalhes: "",
  marca: "",
  aplicacao: "",
  solicitante: "",
  data: hojeISO(),
};

function localFinal(form) {
  if (form.tipoLocal === "escritorio") return "Escritório/Stand";
  if (form.tipoLocal === "obra") return form.obraEscolhida;
  return "";
}

// ---------------------------------------------
// Componente: Formulário de novo insumo
// ---------------------------------------------

function FormularioInsumo({ aberto, onFechar, onCriar }) {
  const [etapa, setEtapa] = useState(ETAPA.LOCAL_TIPO);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erros, setErros] = useState({});

  useEffect(() => {
    if (aberto) {
      setEtapa(ETAPA.LOCAL_TIPO);
      setForm(FORM_VAZIO);
      setErros({});
    }
  }, [aberto]);

  if (!aberto) return null;

  const escolherTipoLocal = (tipo) => {
    setForm((f) => ({ ...f, tipoLocal: tipo, obraEscolhida: "" }));
    if (tipo === "escritorio") {
      setEtapa(ETAPA.DETALHES);
    } else {
      setEtapa(ETAPA.LOCAL_OBRA);
    }
  };

  const escolherObra = (obra) => {
    setForm((f) => ({ ...f, obraEscolhida: obra }));
    setEtapa(ETAPA.DETALHES);
  };

  const validar = () => {
    const novosErros = {};
    if (!form.nomeInsumo.trim()) novosErros.nomeInsumo = "Informe o nome do insumo.";
    if (!form.unidadeMedida.trim()) novosErros.unidadeMedida = "Informe a unidade de medida.";
    if (!form.detalhes.trim()) novosErros.detalhes = "Descreva os detalhes do insumo.";
    if (!form.aplicacao.trim()) novosErros.aplicacao = "Informe a aplicação.";
    if (!form.solicitante.trim()) novosErros.solicitante = "Informe o nome do solicitante.";
    if (!form.data) novosErros.data = "Selecione a data.";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const submeter = (e) => {
    e.preventDefault();
    if (!validar()) return;
    onCriar({
      id: gerarId(),
      nomeInsumo: form.nomeInsumo.trim(),
      unidadeMedida: form.unidadeMedida.trim(),
      local: localFinal(form),
      detalhes: form.detalhes.trim(),
      marca: form.marca.trim(),
      aplicacao: form.aplicacao.trim(),
      solicitante: form.solicitante.trim(),
      data: form.data,
      coluna: "a-fazer",
      criadoEm: Date.now(),
    });
  };

  const atualizar = (campo) => (e) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Cadastro de novo insumo">
      <div className="overlay-backdrop" onClick={onFechar} />
      <div className="painel-form">
        <header className="painel-form-header">
          <div className="painel-form-titulo">
            {etapa !== ETAPA.LOCAL_TIPO && (
              <button
                type="button"
                className="btn-icone"
                onClick={() =>
                  setEtapa(etapa === ETAPA.DETALHES && form.tipoLocal === "obra" ? ETAPA.LOCAL_OBRA : ETAPA.LOCAL_TIPO)
                }
                aria-label="Voltar"
              >
                <Icon.Back className="ic" />
              </button>
            )}
            <h2>Cadastro de insumo</h2>
          </div>
          <button type="button" className="btn-icone" onClick={onFechar} aria-label="Fechar formulário">
            <Icon.Close className="ic" />
          </button>
        </header>

        {/* trilha de progresso */}
        <div className="trilha" aria-hidden="true">
          <span className={`trilha-passo ${etapa !== "" ? "ativo" : ""}`} />
          <span className={`trilha-passo ${etapa === ETAPA.LOCAL_OBRA || etapa === ETAPA.DETALHES ? "ativo" : ""}`} />
          <span className={`trilha-passo ${etapa === ETAPA.DETALHES ? "ativo" : ""}`} />
        </div>

        <div className="painel-form-corpo">
          {etapa === ETAPA.LOCAL_TIPO && (
            <section className="etapa-local">
              <p className="etapa-pergunta">Onde esse insumo será aplicado?</p>
              <div className="opcoes-grandes">
                <button type="button" className="opcao-grande" onClick={() => escolherTipoLocal("escritorio")}>
                  <Icon.Tag className="ic-grande" />
                  <span>Escritório/Stand</span>
                  <Icon.Chevron className="ic-seta" />
                </button>
                <button type="button" className="opcao-grande" onClick={() => escolherTipoLocal("obra")}>
                  <Icon.Building className="ic-grande" />
                  <span>Obras</span>
                  <Icon.Chevron className="ic-seta" />
                </button>
              </div>
            </section>
          )}

          {etapa === ETAPA.LOCAL_OBRA && (
            <section className="etapa-local">
              <p className="etapa-pergunta">Qual obra?</p>
              <div className="lista-obras">
                {OBRAS.map((obra) => (
                  <button type="button" key={obra} className="opcao-obra" onClick={() => escolherObra(obra)}>
                    <span>{obra}</span>
                    <Icon.Chevron className="ic-seta" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {etapa === ETAPA.DETALHES && (
            <form className="etapa-detalhes" onSubmit={submeter} noValidate>
              <div className="local-resumo">
                <Icon.Building className="ic-pequeno" />
                <span>{localFinal(form)}</span>
                <button
                  type="button"
                  className="link-trocar"
                  onClick={() => setEtapa(form.tipoLocal === "obra" ? ETAPA.LOCAL_OBRA : ETAPA.LOCAL_TIPO)}
                >
                  Trocar
                </button>
              </div>

              <Campo label="Nome do Insumo" obrigatorio erro={erros.nomeInsumo}>
                <input
                  type="text"
                  value={form.nomeInsumo}
                  onChange={atualizar("nomeInsumo")}
                  placeholder="Ex.: Chibanca Alvião"
                  autoFocus
                />
              </Campo>

              <div className="campo-linha">
                <Campo label="Unidade de Medida" obrigatorio erro={erros.unidadeMedida}>
                  <input
                    type="text"
                    value={form.unidadeMedida}
                    onChange={atualizar("unidadeMedida")}
                    placeholder="Ex.: Un., Kg, m²"
                  />
                </Campo>
                <Campo label="Marca">
                  <input
                    type="text"
                    value={form.marca}
                    onChange={atualizar("marca")}
                    placeholder="Insira o valor aqui"
                  />
                </Campo>
              </div>

              <Campo label="Detalhes" obrigatorio erro={erros.detalhes}>
                <textarea
                  value={form.detalhes}
                  onChange={atualizar("detalhes")}
                  placeholder="Descreva o insumo"
                  rows={3}
                />
              </Campo>

              <Campo label="Aplicação" obrigatorio erro={erros.aplicacao}>
                <input
                  type="text"
                  value={form.aplicacao}
                  onChange={atualizar("aplicacao")}
                  placeholder="Ex.: Obra"
                />
              </Campo>

              <div className="campo-linha">
                <Campo label="Solicitante" obrigatorio erro={erros.solicitante}>
                  <input
                    type="text"
                    value={form.solicitante}
                    onChange={atualizar("solicitante")}
                    placeholder="Seu nome"
                  />
                </Campo>
                <Campo label="Data" obrigatorio erro={erros.data}>
                  <input type="date" value={form.data} onChange={atualizar("data")} />
                </Campo>
              </div>

              <footer className="painel-form-rodape">
                <button type="button" className="btn-secundario" onClick={onFechar}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primario">
                  Cadastrar insumo
                </button>
              </footer>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, obrigatorio, erro, children }) {
  return (
    <label className="campo">
      <span className="campo-label">
        {label} {obrigatorio && <span className="campo-asterisco">*</span>}
      </span>
      {children}
      {erro && <span className="campo-erro">{erro}</span>}
    </label>
  );
}

// ---------------------------------------------
// Componente: Card do Kanban
// ---------------------------------------------

function CardInsumo({ card, onAbrir, onArrastarInicio }) {
  return (
    <article
      className="card"
      draggable
      onDragStart={(e) => onArrastarInicio(e, card.id)}
      onClick={() => onAbrir(card)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter") onAbrir(card);
      }}
    >
      <div className="card-topo">
        <span className="card-id">{card.id}</span>
        <span className="card-local">{card.local}</span>
      </div>
      <h3 className="card-nome">{card.nomeInsumo}</h3>
      <p className="card-detalhes">{card.detalhes}</p>
      <div className="card-rodape">
        <span className="card-solicitante">
          <span className="avatar-mini">{card.solicitante.charAt(0).toUpperCase()}</span>
          {card.solicitante}
        </span>
        <span className="card-data">{formatarDataBR(card.data)}</span>
      </div>
    </article>
  );
}

// ---------------------------------------------
// Componente: Detalhe do card (visualização completa)
// ---------------------------------------------

function DetalheCard({ card, onFechar, onMudarColuna, onExcluir }) {
  if (!card) return null;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`Detalhes de ${card.nomeInsumo}`}>
      <div className="overlay-backdrop" onClick={onFechar} />
      <div className="painel-detalhe">
        <header className="painel-form-header">
          <div className="painel-form-titulo">
            <h2>{card.nomeInsumo}</h2>
          </div>
          <button type="button" className="btn-icone" onClick={onFechar} aria-label="Fechar">
            <Icon.Close className="ic" />
          </button>
        </header>

        <div className="painel-detalhe-corpo">
          <div className="detalhe-id">{card.id}</div>

          <div className="detalhe-grade">
            <DetalheItem icone={<Icon.Box className="ic-pequeno" />} rotulo="Unidade de Medida" valor={card.unidadeMedida} />
            <DetalheItem icone={<Icon.Building className="ic-pequeno" />} rotulo="Obra(s)" valor={card.local} />
            <DetalheItem icone={<Icon.Tag className="ic-pequeno" />} rotulo="Marca" valor={card.marca || "—"} />
            <DetalheItem icone={<Icon.Tag className="ic-pequeno" />} rotulo="Aplicação" valor={card.aplicacao} />
            <DetalheItem icone={<Icon.User className="ic-pequeno" />} rotulo="Solicitante" valor={card.solicitante} />
            <DetalheItem icone={<Icon.Calendar className="ic-pequeno" />} rotulo="Data" valor={formatarDataBR(card.data)} />
          </div>

          <div className="detalhe-bloco">
            <span className="detalhe-rotulo">Detalhes</span>
            <p className="detalhe-texto">{card.detalhes}</p>
          </div>

          <div className="detalhe-bloco">
            <span className="detalhe-rotulo">Status</span>
            <div className="select-status">
              {COLUNAS.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  className={`pill-status ${card.coluna === col.id ? "ativo" : ""}`}
                  style={card.coluna === col.id ? { "--cor": col.cor } : undefined}
                  onClick={() => onMudarColuna(card.id, col.id)}
                >
                  {col.titulo}
                </button>
              ))}
            </div>
          </div>
        </div>

        <footer className="painel-form-rodape painel-detalhe-rodape">
          <button type="button" className="btn-perigo" onClick={() => onExcluir(card.id)}>
            <Icon.Trash className="ic-pequeno" />
            Excluir
          </button>
        </footer>
      </div>
    </div>
  );
}

function DetalheItem({ icone, rotulo, valor }) {
  return (
    <div className="detalhe-item">
      <span className="detalhe-item-rotulo">
        {icone}
        {rotulo}
      </span>
      <span className="detalhe-item-valor">{valor}</span>
    </div>
  );
}

// ---------------------------------------------
// App principal
// ---------------------------------------------

export default function App() {
  const [cards, setCards] = useState(() => carregarCards());
  const [formAberto, setFormAberto] = useState(false);
  const [cardSelecionado, setCardSelecionado] = useState(null);
  const [busca, setBusca] = useState("");
  const [colunaArrastandoSobre, setColunaArrastandoSobre] = useState(null);

  useEffect(() => {
    salvarCards(cards);
  }, [cards]);

  const criarCard = useCallback((novo) => {
    setCards((prev) => [novo, ...prev]);
    setFormAberto(false);
  }, []);

  const mudarColuna = useCallback((id, coluna) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, coluna } : c)));
    setCardSelecionado((sel) => (sel && sel.id === id ? { ...sel, coluna } : sel));
  }, []);

  const excluirCard = useCallback((id) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    setCardSelecionado(null);
  }, []);

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

  const buscaNormalizada = busca.trim().toLowerCase();
  const cardsFiltrados = buscaNormalizada
    ? cards.filter((c) =>
        [c.nomeInsumo, c.local, c.solicitante, c.aplicacao, c.id]
          .join(" ")
          .toLowerCase()
          .includes(buscaNormalizada)
      )
    : cards;

  return (
    <div className="app">
      <style>{ESTILOS}</style>

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
        </div>
      </header>

      <main className="quadro">
        {COLUNAS.map((coluna) => {
          const itens = cardsFiltrados.filter((c) => c.coluna === coluna.id);
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
                {itens.length === 0 ? (
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

      <FormularioInsumo aberto={formAberto} onFechar={() => setFormAberto(false)} onCriar={criarCard} />

      <DetalheCard
        card={cardSelecionado}
        onFechar={() => setCardSelecionado(null)}
        onMudarColuna={mudarColuna}
        onExcluir={excluirCard}
      />
    </div>
  );
}

// ---------------------------------------------
// Estilos
// ---------------------------------------------

const ESTILOS = `
  :root {
    --azul-600: #2563eb;
    --azul-700: #1d4ed8;
    --azul-50: #eff6ff;
    --tinta-900: #111827;
    --tinta-700: #374151;
    --tinta-500: #6b7280;
    --tinta-300: #d1d5db;
    --tinta-200: #e5e7eb;
    --tinta-100: #f3f4f6;
    --tinta-50: #f9fafb;
    --branco: #ffffff;
    --vermelho-600: #dc2626;
    --vermelho-50: #fef2f2;
    --raio: 10px;
    --raio-sm: 7px;
    --sombra-card: 0 1px 2px rgba(17,24,39,0.06), 0 1px 1px rgba(17,24,39,0.04);
    --sombra-painel: 0 20px 50px rgba(17,24,39,0.18), 0 4px 12px rgba(17,24,39,0.08);
    --fonte: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif;
  }

  * { box-sizing: border-box; }

  .app {
    font-family: var(--fonte);
    color: var(--tinta-900);
    background: var(--tinta-50);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .ic, .ic-pequeno, .ic-grande, .ic-seta, .ic-vazia, .topo-icone {
    display: block;
    flex-shrink: 0;
  }
  .ic { width: 18px; height: 18px; }
  .ic-pequeno { width: 15px; height: 15px; color: var(--tinta-500); }
  .ic-grande { width: 26px; height: 26px; color: var(--azul-600); }
  .ic-seta { width: 16px; height: 16px; color: var(--tinta-300); }
  .ic-vazia { width: 44px; height: 28px; color: var(--tinta-300); }
  .topo-icone { width: 20px; height: 20px; color: var(--branco); }

  /* ---------- Topo ---------- */

  .topo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 18px 28px;
    background: var(--branco);
    border-bottom: 1px solid var(--tinta-200);
    flex-wrap: wrap;
  }

  .topo-titulo {
    display: flex;
    align-items: center;
    gap: 13px;
  }

  .topo-icone-wrap {
    width: 38px;
    height: 38px;
    border-radius: var(--raio-sm);
    background: var(--azul-600);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .topo-titulo h1 {
    font-size: 17px;
    font-weight: 650;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .topo-titulo p {
    font-size: 12.5px;
    color: var(--tinta-500);
    margin: 1px 0 0;
  }

  .topo-acoes {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .campo-busca {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--tinta-100);
    border: 1px solid transparent;
    border-radius: var(--raio-sm);
    padding: 8px 12px;
    width: 240px;
    transition: border-color 0.15s, background 0.15s;
  }

  .campo-busca:focus-within {
    background: var(--branco);
    border-color: var(--azul-600);
  }

  .campo-busca input {
    border: none;
    background: transparent;
    outline: none;
    font-size: 13.5px;
    width: 100%;
    color: var(--tinta-900);
    font-family: inherit;
  }

  .campo-busca input::placeholder { color: var(--tinta-500); }

  .btn-novo { white-space: nowrap; }

  /* ---------- Quadro Kanban ---------- */

  .quadro {
    flex: 1;
    display: flex;
    gap: 18px;
    padding: 22px 28px 32px;
    overflow-x: auto;
    align-items: flex-start;
  }

  .coluna {
    background: var(--tinta-100);
    border-radius: 12px;
    width: 320px;
    min-width: 320px;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 110px);
    border: 1.5px solid transparent;
    transition: border-color 0.12s, background 0.12s;
  }

  .coluna.arrastando-sobre {
    border-color: var(--azul-600);
    background: var(--azul-50);
  }

  .coluna-header {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 15px 16px 11px;
  }

  .coluna-marcador {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--cor);
    flex-shrink: 0;
  }

  .coluna-header h2 {
    font-size: 13.5px;
    font-weight: 650;
    margin: 0;
    flex: 1;
    color: var(--tinta-700);
  }

  .coluna-contagem {
    font-size: 12px;
    font-weight: 600;
    color: var(--tinta-500);
    background: var(--branco);
    border-radius: 999px;
    padding: 2px 8px;
    min-width: 22px;
    text-align: center;
  }

  .coluna-corpo {
    flex: 1;
    overflow-y: auto;
    padding: 0 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .coluna-vazia {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 36px 16px;
    color: var(--tinta-500);
    font-size: 12.5px;
    border: 1.5px dashed var(--tinta-300);
    border-radius: var(--raio);
    margin-top: 2px;
  }

  .coluna-vazia p { margin: 0; }

  /* ---------- Card ---------- */

  .card {
    background: var(--branco);
    border-radius: var(--raio);
    padding: 13px 14px 12px;
    box-shadow: var(--sombra-card);
    cursor: grab;
    border: 1px solid var(--tinta-200);
    transition: box-shadow 0.15s, border-color 0.15s, transform 0.1s;
  }

  .card:hover {
    box-shadow: 0 4px 14px rgba(17,24,39,0.10);
    border-color: var(--tinta-300);
  }

  .card:active { cursor: grabbing; transform: scale(0.992); }

  .card:focus-visible {
    outline: 2px solid var(--azul-600);
    outline-offset: 2px;
  }

  .card-topo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 7px;
  }

  .card-id {
    font-size: 10.5px;
    font-weight: 600;
    color: var(--tinta-500);
    letter-spacing: 0.02em;
  }

  .card-local {
    font-size: 10.5px;
    font-weight: 600;
    color: var(--azul-700);
    background: var(--azul-50);
    padding: 2px 8px;
    border-radius: 999px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
  }

  .card-nome {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 4px;
    color: var(--tinta-900);
    line-height: 1.3;
  }

  .card-detalhes {
    font-size: 12.5px;
    color: var(--tinta-500);
    margin: 0 0 11px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-rodape {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 9px;
    border-top: 1px solid var(--tinta-100);
  }

  .card-solicitante {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    color: var(--tinta-700);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .avatar-mini {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--azul-600);
    color: var(--branco);
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .card-data {
    font-size: 11px;
    color: var(--tinta-500);
    flex-shrink: 0;
  }

  /* ---------- Botões ---------- */

  .btn-primario, .btn-secundario, .btn-perigo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 600;
    border-radius: var(--raio-sm);
    padding: 9px 16px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background 0.13s, border-color 0.13s, color 0.13s;
  }

  .btn-primario {
    background: var(--azul-600);
    color: var(--branco);
  }
  .btn-primario:hover { background: var(--azul-700); }
  .btn-primario:focus-visible { outline: 2px solid var(--azul-700); outline-offset: 2px; }

  .btn-secundario {
    background: var(--branco);
    color: var(--tinta-700);
    border-color: var(--tinta-300);
  }
  .btn-secundario:hover { background: var(--tinta-100); }

  .btn-perigo {
    background: var(--vermelho-50);
    color: var(--vermelho-600);
  }
  .btn-perigo:hover { background: #fee2e2; }

  .btn-icone {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: var(--raio-sm);
    color: var(--tinta-500);
    cursor: pointer;
    transition: background 0.13s, color 0.13s;
  }
  .btn-icone:hover { background: var(--tinta-100); color: var(--tinta-900); }

  /* ---------- Overlay / Painéis ---------- */

  .overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    justify-content: flex-end;
  }

  .overlay-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(17,24,39,0.42);
    animation: fade-in 0.15s ease;
  }

  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

  .painel-form, .painel-detalhe {
    position: relative;
    width: 460px;
    max-width: 92vw;
    height: 100%;
    background: var(--branco);
    box-shadow: var(--sombra-painel);
    display: flex;
    flex-direction: column;
    animation: deslizar-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes deslizar-in {
    from { transform: translateX(24px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .overlay-backdrop, .painel-form, .painel-detalhe { animation: none; }
  }

  .painel-form-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    border-bottom: 1px solid var(--tinta-200);
    flex-shrink: 0;
  }

  .painel-form-titulo {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .painel-form-titulo h2 {
    font-size: 15.5px;
    font-weight: 650;
    margin: 0;
  }

  .painel-form-corpo, .painel-detalhe-corpo {
    flex: 1;
    overflow-y: auto;
    padding: 22px 20px;
  }

  .painel-form-rodape {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 20px;
    border-top: 1px solid var(--tinta-200);
    flex-shrink: 0;
  }

  .painel-detalhe-rodape { justify-content: flex-start; }

  /* trilha de progresso */

  .trilha {
    display: flex;
    gap: 5px;
    padding: 0 20px;
    margin-top: 14px;
  }

  .trilha-passo {
    height: 3px;
    flex: 1;
    border-radius: 999px;
    background: var(--tinta-200);
    transition: background 0.2s;
  }

  .trilha-passo.ativo { background: var(--azul-600); }

  /* ---------- Etapa: local ---------- */

  .etapa-pergunta {
    font-size: 14.5px;
    font-weight: 600;
    color: var(--tinta-900);
    margin: 0 0 16px;
  }

  .opcoes-grandes {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .opcao-grande {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px;
    background: var(--tinta-50);
    border: 1.5px solid var(--tinta-200);
    border-radius: var(--raio);
    cursor: pointer;
    font-family: inherit;
    font-size: 14.5px;
    font-weight: 600;
    color: var(--tinta-900);
    text-align: left;
    transition: border-color 0.13s, background 0.13s;
  }

  .opcao-grande:hover {
    border-color: var(--azul-600);
    background: var(--azul-50);
  }

  .opcao-grande span { flex: 1; }

  .lista-obras {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .opcao-obra {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 13px 15px;
    background: var(--tinta-50);
    border: 1.5px solid var(--tinta-200);
    border-radius: var(--raio-sm);
    cursor: pointer;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 550;
    color: var(--tinta-900);
    text-align: left;
    transition: border-color 0.13s, background 0.13s;
  }

  .opcao-obra:hover {
    border-color: var(--azul-600);
    background: var(--azul-50);
  }

  /* ---------- Etapa: detalhes (formulário final) ---------- */

  .local-resumo {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--azul-50);
    border-radius: var(--raio-sm);
    padding: 9px 12px;
    margin-bottom: 18px;
    font-size: 13px;
    font-weight: 600;
    color: var(--azul-700);
  }

  .local-resumo span:nth-child(2) { flex: 1; }

  .link-trocar {
    background: none;
    border: none;
    color: var(--azul-600);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
    font-family: inherit;
    padding: 0;
  }

  .campo {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }

  .campo-linha {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .campo-linha .campo { margin-bottom: 0; }
  .campo-linha { margin-bottom: 16px; }

  .campo-label {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--tinta-700);
  }

  .campo-asterisco { color: var(--vermelho-600); }

  .campo input[type="text"],
  .campo input[type="date"],
  .campo textarea {
    font-family: inherit;
    font-size: 13.5px;
    padding: 9px 11px;
    border: 1.5px solid var(--tinta-200);
    border-radius: var(--raio-sm);
    outline: none;
    color: var(--tinta-900);
    background: var(--branco);
    transition: border-color 0.13s;
    width: 100%;
  }

  .campo input:focus, .campo textarea:focus {
    border-color: var(--azul-600);
  }

  .campo textarea { resize: vertical; min-height: 64px; }

  .campo-erro {
    font-size: 11.5px;
    color: var(--vermelho-600);
    font-weight: 500;
  }

  /* ---------- Detalhe do card ---------- */

  .detalhe-id {
    font-size: 12px;
    font-weight: 600;
    color: var(--tinta-500);
    margin-bottom: 18px;
  }

  .detalhe-grade {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 22px;
  }

  .detalhe-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .detalhe-item-rotulo {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--tinta-500);
  }

  .detalhe-item-valor {
    font-size: 13.5px;
    font-weight: 550;
    color: var(--tinta-900);
  }

  .detalhe-bloco {
    margin-bottom: 22px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .detalhe-rotulo {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--tinta-500);
  }

  .detalhe-texto {
    font-size: 13.5px;
    color: var(--tinta-900);
    line-height: 1.55;
    margin: 0;
    white-space: pre-wrap;
  }

  .select-status {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .pill-status {
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    padding: 7px 14px;
    border-radius: 999px;
    border: 1.5px solid var(--tinta-300);
    background: var(--branco);
    color: var(--tinta-700);
    cursor: pointer;
    transition: border-color 0.13s, background 0.13s, color 0.13s;
  }

  .pill-status:hover { border-color: var(--tinta-500); }

  .pill-status.ativo {
    border-color: var(--cor);
    background: var(--cor);
    color: var(--branco);
  }

  /* ---------- Responsivo ---------- */

  @media (max-width: 720px) {
    .topo {
      padding: 14px 16px;
    }
    .topo-titulo p { display: none; }
    .campo-busca { width: 100%; order: 3; }
    .topo-acoes { width: 100%; flex-wrap: wrap; }
    .btn-novo { flex: 1; }
    .quadro { padding: 16px; gap: 12px; }
    .coluna { width: 280px; min-width: 280px; }
    .painel-form, .painel-detalhe { width: 100%; max-width: 100%; }
    .campo-linha { grid-template-columns: 1fr; }
    .detalhe-grade { grid-template-columns: 1fr; }
  }
`;
