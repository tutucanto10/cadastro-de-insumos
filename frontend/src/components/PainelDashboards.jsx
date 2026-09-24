import React, { useEffect, useState } from "react";
import { Icon } from "./Icon.jsx";
import { COLUNAS, OBRAS } from "../constants.js";
import { api, ErroApi } from "../services/api.js";

const ETAPA = { ESCOLHER_OBRA: "escolher-obra", VER_OBRA: "ver-obra" };

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

export default function PainelDashboards({ aberto, onFechar }) {
  const [etapa, setEtapa] = useState(ETAPA.ESCOLHER_OBRA);
  const [obra, setObra] = useState(null);
  const [dias, setDias] = useState(30);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (aberto) {
      setEtapa(ETAPA.ESCOLHER_OBRA);
      setObra(null);
      setDias(30);
      setDados(null);
      setErro("");
    }
  }, [aberto]);

  useEffect(() => {
    if (etapa !== ETAPA.VER_OBRA || !obra) return;
    setCarregando(true);
    setErro("");
    api
      .dashboardObra(obra, dias)
      .then(setDados)
      .catch((err) => {
        setErro(err instanceof ErroApi ? err.message : "Não foi possível carregar os números.");
      })
      .finally(() => setCarregando(false));
  }, [etapa, obra, dias]);

  if (!aberto) return null;

  const escolherObra = (nomeObra) => {
    setObra(nomeObra);
    setEtapa(ETAPA.VER_OBRA);
  };

  const maiorCarga = dados ? Math.max(1, ...dados.carga_responsavel.map((c) => c.total)) : 1;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Dashboards por obra">
      <div className="overlay-backdrop" onClick={onFechar} />
      <div className="painel-form painel-dashboard">
        <header className="painel-form-header">
          <div className="painel-form-titulo">
            {etapa === ETAPA.VER_OBRA && (
              <button
                type="button"
                className="btn-icone"
                onClick={() => setEtapa(ETAPA.ESCOLHER_OBRA)}
                aria-label="Voltar"
              >
                <Icon.Back className="ic" />
              </button>
            )}
            <h2>{etapa === ETAPA.VER_OBRA ? obra : "Dashboards"}</h2>
          </div>
          <button type="button" className="btn-icone" onClick={onFechar} aria-label="Fechar">
            <Icon.Close className="ic" />
          </button>
        </header>

        <div className="painel-form-corpo">
          {etapa === ETAPA.ESCOLHER_OBRA && (
            <section className="etapa-local">
              <p className="etapa-pergunta">Qual obra?</p>
              <div className="lista-obras">
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

          {etapa === ETAPA.VER_OBRA && (
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
                    </div>
                    <div className="dash-kpi-card">
                      <span className="dash-kpi-numero">{dados.periodo.cancelados}</span>
                      <span className="dash-kpi-legenda">Cancelados no período</span>
                    </div>
                    <div className="dash-kpi-card">
                      <span className="dash-kpi-numero">
                        {dados.tempo_medio_conclusao_dias ?? "—"}
                      </span>
                      <span className="dash-kpi-legenda">Dias em média até concluir</span>
                    </div>
                  </div>

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
                          <span className="dash-item-dias">há {diasDesde(item.criado_em)}d</span>
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
