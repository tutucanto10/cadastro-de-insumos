import React, { useEffect, useState } from "react";
import { Icon } from "./Icon.jsx";
import { COLUNAS, OBRAS } from "../constants.js";
import { api, ErroApi } from "../services/api.js";

const ETAPA = { ESCOLHER_LOCAL: "escolher-local", VER_DASHBOARD: "ver-dashboard" };

const PERIODOS = [
  { dias: 7, titulo: "Últimos 7 dias" },
  { dias: 30, titulo: "Últimos 30 dias" },
  { dias: 90, titulo: "Últimos 90 dias" },
  { dias: null, titulo: "Tudo" },
];

function diasDesde(isoDatetime) {
  const ms = Date.now() - new Date(isoDatetime).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function corColuna(colunaId) {
  return COLUNAS.find((c) => c.id === colunaId)?.cor || "#6b7280";
}

// Delta vs. período anterior de mesmo tamanho — maisEbom decide a cor:
// concluídos (mais é bom) vs. cancelados/tempo médio (menos é bom).
function DeltaBadge({ atual, anterior, maisEbom }) {
  if (anterior == null || atual == null) return null;
  const diferenca = atual - anterior;
  if (diferenca === 0) return <span className="dash-delta dash-delta-neutro">= período anterior</span>;

  const subiu = diferenca > 0;
  const bom = subiu === maisEbom;
  const seta = subiu ? "▲" : "▼";
  const valorAbs = Number.isInteger(diferenca) ? Math.abs(diferenca) : Math.abs(diferenca).toFixed(1);

  return (
    <span className={`dash-delta ${bom ? "dash-delta-bom" : "dash-delta-ruim"}`}>
      {seta} {valorAbs} vs. período anterior
    </span>
  );
}

// Donut de "Status atual" via stroke-dasharray num círculo — sem lib de
// gráfico. Reaproveita as cores que o próprio Kanban já usa pra cada
// coluna (COLUNAS.cor), pra bater visualmente com o resto do app.
function GraficoDonutStatus({ dados }) {
  const total = dados.reduce((soma, d) => soma + d.total, 0);
  const RAIO = 44;
  const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
  const GAP = total > 0 ? 3 : 0; // espaço (em px de arco) entre fatias

  let acumulado = 0;
  const fatias = dados
    .filter((d) => d.total > 0)
    .map((d) => {
      const comprimentoTotal = (d.total / total) * CIRCUNFERENCIA;
      const inicio = acumulado;
      acumulado += comprimentoTotal;
      const comprimentoVisivel = Math.max(0, comprimentoTotal - GAP);
      return { ...d, dashoffset: -inicio, dasharray: `${comprimentoVisivel} ${CIRCUNFERENCIA}` };
    });

  return (
    <div className="dash-donut">
      <svg viewBox="0 0 120 120" className="dash-donut-svg" role="img" aria-label="Status atual dos chamados">
        <circle cx="60" cy="60" r={RAIO} fill="none" stroke="var(--tinta-100)" strokeWidth="16" />
        {fatias.map((f) => (
          <circle
            key={f.coluna}
            cx="60"
            cy="60"
            r={RAIO}
            fill="none"
            stroke={corColuna(f.coluna)}
            strokeWidth="16"
            strokeDasharray={f.dasharray}
            strokeDashoffset={f.dashoffset}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          >
            <title>
              {COLUNAS.find((c) => c.id === f.coluna)?.titulo}: {f.total} ({Math.round((f.total / total) * 100)}%)
            </title>
          </circle>
        ))}
        <text x="60" y="57" textAnchor="middle" className="dash-donut-total-num">
          {total}
        </text>
        <text x="60" y="72" textAnchor="middle" className="dash-donut-total-label">
          chamados
        </text>
      </svg>

      <ul className="dash-donut-legenda">
        {dados.map((d) => (
          <li key={d.coluna} className="dash-donut-legenda-item">
            <span className="dash-donut-ponto" style={{ "--cor": corColuna(d.coluna) }} />
            <span className="dash-donut-legenda-nome">
              {COLUNAS.find((c) => c.id === d.coluna)?.titulo}
            </span>
            <span className="dash-donut-legenda-numero">{d.total}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Barras verticais pro volume de chamados no período — uma única cor
// (comparação de magnitude, não de identidade, então não usa paleta
// categórica: ver skill de dataviz, "compare magnitude -> sequential/1 hue").
function GraficoBarrasVolume({ dados }) {
  const maior = Math.max(1, ...dados.map((d) => d.total));

  return (
    <div className="dash-barras-volume">
      {dados.map((d) => (
        <div key={d.rotulo} className="dash-barra-volume-coluna">
          <span className="dash-barra-volume-valor">{d.total > 0 ? d.total : ""}</span>
          <div className="dash-barra-volume-trilha">
            <div
              className="dash-barra-volume-barra"
              style={{ height: `${(d.total / maior) * 100}%` }}
              title={`${d.rotulo}: ${d.total}`}
            />
          </div>
          <span className="dash-barra-volume-rotulo">{d.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

export default function PainelDashboards({ aberto, onFechar }) {
  const [etapa, setEtapa] = useState(ETAPA.ESCOLHER_LOCAL);
  // selecao: { tipo: "obra" | "escritorio" | "escritorio-local", nome? }
  const [selecao, setSelecao] = useState(null);
  const [dias, setDias] = useState(30);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [locaisEscritorio, setLocaisEscritorio] = useState([]);

  useEffect(() => {
    if (aberto) {
      setEtapa(ETAPA.ESCOLHER_LOCAL);
      setSelecao(null);
      setDias(30);
      setDados(null);
      setErro("");
      api
        .listarLocaisEscritorio()
        .then(setLocaisEscritorio)
        .catch(() => setLocaisEscritorio([]));
    }
  }, [aberto]);

  useEffect(() => {
    if (etapa !== ETAPA.VER_DASHBOARD || !selecao) return;
    setCarregando(true);
    setErro("");
    let busca;
    if (selecao.tipo === "escritorio") busca = api.dashboardEscritorio(dias);
    else if (selecao.tipo === "escritorio-local") busca = api.dashboardEscritorioLocal(selecao.nome, dias);
    else busca = api.dashboardObra(selecao.nome, dias);

    busca
      .then(setDados)
      .catch((err) => {
        setErro(err instanceof ErroApi ? err.message : "Não foi possível carregar os números.");
      })
      .finally(() => setCarregando(false));
  }, [etapa, selecao, dias]);

  if (!aberto) return null;

  const escolherObra = (nomeObra) => {
    setSelecao({ tipo: "obra", nome: nomeObra });
    setEtapa(ETAPA.VER_DASHBOARD);
  };

  const escolherEscritorio = () => {
    setSelecao({ tipo: "escritorio" });
    setEtapa(ETAPA.VER_DASHBOARD);
  };

  const escolherEscritorioLocal = (nomeLocal) => {
    setSelecao({ tipo: "escritorio-local", nome: nomeLocal });
    setEtapa(ETAPA.VER_DASHBOARD);
  };

  const tituloAtual =
    selecao?.tipo === "escritorio"
      ? "Escritório/Stand"
      : selecao?.tipo === "escritorio-local"
      ? `Escritório/Stand > ${selecao.nome}`
      : selecao?.nome;

  const maiorCarga = dados ? Math.max(1, ...dados.carga_responsavel.map((c) => c.total)) : 1;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Dashboards">
      <div className="overlay-backdrop" onClick={onFechar} />
      <div className="painel-form painel-dashboard">
        <header className="painel-form-header">
          <div className="painel-form-titulo">
            {etapa === ETAPA.VER_DASHBOARD && (
              <button
                type="button"
                className="btn-icone"
                onClick={() => setEtapa(ETAPA.ESCOLHER_LOCAL)}
                aria-label="Voltar"
              >
                <Icon.Back className="ic" />
              </button>
            )}
            <h2>{etapa === ETAPA.VER_DASHBOARD ? tituloAtual : "Dashboards"}</h2>
          </div>
          <button type="button" className="btn-icone" onClick={onFechar} aria-label="Fechar">
            <Icon.Close className="ic" />
          </button>
        </header>

        <div className="painel-form-corpo">
          {etapa === ETAPA.ESCOLHER_LOCAL && (
            <section className="etapa-local">
              <p className="etapa-pergunta">Qual local?</p>
              <div className="lista-obras">
                <button type="button" className="opcao-obra" onClick={escolherEscritorio}>
                  <span>Escritório/Stand</span>
                  <Icon.Chevron className="ic-seta" />
                </button>
                {locaisEscritorio.length > 0 && (
                  <div className="lista-locais-escritorio">
                    {locaisEscritorio.map((l) => (
                      <button
                        type="button"
                        key={l.local}
                        className="opcao-obra opcao-local-escritorio"
                        onClick={() => escolherEscritorioLocal(l.local)}
                      >
                        <span>{l.local}</span>
                        <span className="opcao-local-contagem">{l.total}</span>
                      </button>
                    ))}
                  </div>
                )}
                {OBRAS.map((nomeObra) => (
                  <button
                    type="button"
                    key={nomeObra}
                    className="opcao-obra"
                    onClick={() => escolherObra(nomeObra)}
                  >
                    <span>{nomeObra}</span>
                    <Icon.Chevron className="ic-seta" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {etapa === ETAPA.VER_DASHBOARD && (
            <section className="dash">
              <select
                className="dash-periodo"
                value={dias ?? "tudo"}
                onChange={(e) => setDias(e.target.value === "tudo" ? null : Number(e.target.value))}
              >
                {PERIODOS.map((p) => (
                  <option key={p.titulo} value={p.dias ?? "tudo"}>
                    {p.titulo}
                  </option>
                ))}
              </select>

              {carregando && <p className="dash-mensagem">Carregando…</p>}
              {erro && <p className="dash-mensagem dash-erro">{erro}</p>}

              {dados && !carregando && (
                <>
                  <div className="dash-kpis">
                    <div className="dash-kpi-card">
                      <span className="dash-kpi-numero">{dados.em_aberto.total}</span>
                      <span className="dash-kpi-legenda">
                        Em aberto ({dados.em_aberto.a_fazer} a fazer, {dados.em_aberto.em_andamento} em andamento)
                      </span>
                    </div>
                    <div className="dash-kpi-card">
                      <span className="dash-kpi-numero">{dados.periodo.concluidos}</span>
                      <span className="dash-kpi-legenda">Concluídos no período</span>
                      <DeltaBadge
                        atual={dados.periodo.concluidos}
                        anterior={dados.periodo_anterior?.concluidos}
                        maisEbom={true}
                      />
                    </div>
                    <div className="dash-kpi-card">
                      <span className="dash-kpi-numero">{dados.periodo.cancelados}</span>
                      <span className="dash-kpi-legenda">Cancelados no período</span>
                      <DeltaBadge
                        atual={dados.periodo.cancelados}
                        anterior={dados.periodo_anterior?.cancelados}
                        maisEbom={false}
                      />
                    </div>
                    <div className="dash-kpi-card">
                      <span className="dash-kpi-numero">
                        {dados.tempo_medio_conclusao_dias ?? "—"}
                      </span>
                      <span className="dash-kpi-legenda">Dias em média até concluir</span>
                      <DeltaBadge
                        atual={dados.tempo_medio_conclusao_dias}
                        anterior={dados.periodo_anterior?.tempo_medio_conclusao_dias}
                        maisEbom={false}
                      />
                    </div>
                  </div>

                  <h3 className="dash-secao-titulo">Status atual</h3>
                  <GraficoDonutStatus dados={dados.status_atual} />

                  <h3 className="dash-secao-titulo">Volume de chamados no período</h3>
                  {dados.volume_periodo.every((d) => d.total === 0) ? (
                    <p className="dash-mensagem">Nenhum chamado aberto no período.</p>
                  ) : (
                    <GraficoBarrasVolume dados={dados.volume_periodo} />
                  )}

                  <h3 className="dash-secao-titulo">Mais antigos ainda em aberto</h3>
                  {dados.mais_antigos_abertos.length === 0 ? (
                    <p className="dash-mensagem">Nenhum chamado em aberto — tudo em dia.</p>
                  ) : (
                    <ul className="dash-lista-antigos">
                      {dados.mais_antigos_abertos.map((item) => (
                        <li key={item.id} className="dash-item-antigo">
                          <span
                            className="dash-marcador"
                            style={{ "--cor": corColuna(item.coluna) }}
                          />
                          <span className="dash-item-nome">{item.nome_insumo}</span>
                          <span className={`dash-item-dias ${item.atrasado ? "dash-item-dias-atrasado" : ""}`}>
                            há {diasDesde(item.criado_em)}d
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <h3 className="dash-secao-titulo">Carga por responsável</h3>
                  {dados.carga_responsavel.length === 0 ? (
                    <p className="dash-mensagem">Nenhum chamado em aberto no momento.</p>
                  ) : (
                    <ul className="dash-carga">
                      {dados.carga_responsavel.map((c) => (
                        <li key={c.responsavel} className="dash-carga-item">
                          <span className="dash-carga-nome">{c.responsavel}</span>
                          <span className="dash-carga-barra-trilha">
                            <span
                              className="dash-carga-barra"
                              style={{ width: `${(c.total / maiorCarga) * 100}%` }}
                            />
                          </span>
                          <span className="dash-carga-numero">{c.total}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
