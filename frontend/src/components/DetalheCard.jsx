import React, { useEffect, useState } from "react";
import { Icon } from "./Icon.jsx";
import { COLUNAS, RESPONSAVEIS_CHAMADO, formatarDataBR, formatarHora } from "../constants.js";

export default function DetalheCard({
  card,
  onFechar,
  onMudarColuna,
  onMudarResponsavelChamado,
  onMudarInsumoAtendente,
  onExcluir,
  buscarEventosEmail,
}) {
  const [eventos, setEventos] = useState([]);
  const [carregandoEventos, setCarregandoEventos] = useState(false);
  const [motivoAberto, setMotivoAberto] = useState(false);
  const [motivoTexto, setMotivoTexto] = useState("");
  const [motivoErro, setMotivoErro] = useState("");
  const [insumoAtendenteTexto, setInsumoAtendenteTexto] = useState("");

  useEffect(() => {
    if (!card) return;
    setCarregandoEventos(true);
    buscarEventosEmail(card.id)
      .then(setEventos)
      .catch(() => setEventos([]))
      .finally(() => setCarregandoEventos(false));
  }, [card, buscarEventosEmail]);

  useEffect(() => {
    setInsumoAtendenteTexto(card?.insumo_atendente || "");
  }, [card?.id]);

  if (!card) return null;

  const salvarInsumoAtendente = () => {
    const texto = insumoAtendenteTexto.trim();
    if (texto !== (card.insumo_atendente || "")) {
      onMudarInsumoAtendente(card.id, texto);
    }
  };

  const escolherColuna = (colunaId) => {
    if (colunaId === "cancelado") {
      setMotivoTexto("");
      setMotivoErro("");
      setMotivoAberto(true);
      return;
    }
    onMudarColuna(card.id, colunaId);
  };

  const confirmarCancelamento = () => {
    if (!motivoTexto.trim()) {
      setMotivoErro("Descreve o motivo do cancelamento.");
      return;
    }
    onMudarColuna(card.id, "cancelado", motivoTexto.trim());
    setMotivoAberto(false);
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`Detalhes de ${card.nome_insumo}`}>
      <div className="overlay-backdrop" onClick={onFechar} />
      <div className="painel-detalhe">
        <header className="painel-form-header">
          <div className="painel-form-titulo">
            <h2>{card.nome_insumo}</h2>
          </div>
          <button type="button" className="btn-icone" onClick={onFechar} aria-label="Fechar">
            <Icon.Close className="ic" />
          </button>
        </header>

        <div className="painel-detalhe-corpo">
          <div className="detalhe-id">
            {card.id}
            {card.origem === "sharepoint" && (
              <span className="detalhe-origem-tag">Importado via SharePoint List</span>
            )}
          </div>

          <div className="detalhe-grade">
            <DetalheItem icone={<Icon.Box className="ic-pequeno" />} rotulo="Unidade de Medida" valor={card.unidade_medida} />
            <DetalheItem icone={<Icon.Building className="ic-pequeno" />} rotulo="Obra(s)" valor={card.local_exibicao} />
            <DetalheItem icone={<Icon.Tag className="ic-pequeno" />} rotulo="Marca" valor={card.marca || "—"} />
            <DetalheItem icone={<Icon.Tag className="ic-pequeno" />} rotulo="Centro de Custo" valor={card.aplicacao} />
            <DetalheItem icone={<Icon.User className="ic-pequeno" />} rotulo="Solicitante" valor={card.solicitante_nome} />
            <DetalheItem icone={<Icon.Calendar className="ic-pequeno" />} rotulo="Data" valor={formatarDataBR(card.data_solicitacao)} />
            <DetalheItem icone={<Icon.Calendar className="ic-pequeno" />} rotulo="Hora de entrada" valor={formatarHora(card.criado_em)} />
          </div>

          {card.coluna === "cancelado" && card.motivo_cancelamento && (
            <div className="detalhe-bloco">
              <span className="detalhe-rotulo">Motivo do cancelamento</span>
              <p className="detalhe-texto">{card.motivo_cancelamento}</p>
            </div>
          )}

          <div className="detalhe-bloco">
            <span className="detalhe-rotulo">Email do solicitante</span>
            <p className="detalhe-texto">{card.solicitante_email}</p>
          </div>

          <div className="detalhe-bloco">
            <span className="detalhe-rotulo">Detalhes</span>
            <p className="detalhe-texto">{card.detalhes}</p>
          </div>

          <div className="detalhe-bloco">
            <span className="detalhe-rotulo">Insumo</span>
            <input
              type="text"
              className="input-insumo-atendente"
              value={insumoAtendenteTexto}
              onChange={(e) => setInsumoAtendenteTexto(e.target.value)}
              onBlur={salvarInsumoAtendente}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              placeholder="Preenchido pelo atendimento"
            />
          </div>

          <div className="detalhe-bloco">
            <span className="detalhe-rotulo">Responsável pelo chamado</span>
            <select
              className="select-responsavel-chamado"
              value={card.responsavel_chamado || ""}
              onChange={(e) => onMudarResponsavelChamado(card.id, e.target.value)}
            >
              <option value="" disabled>
                Selecione…
              </option>
              {RESPONSAVEIS_CHAMADO.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
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
                  onClick={() => escolherColuna(col.id)}
                >
                  {col.titulo}
                </button>
              ))}
            </div>
          </div>

          <div className="detalhe-bloco">
            <span className="detalhe-rotulo">
              <Icon.Mail className="ic-pequeno" style={{ marginRight: 5, verticalAlign: "-2px" }} />
              Histórico de notificações
            </span>
            {carregandoEventos ? (
              <p className="detalhe-texto-sutil">Carregando…</p>
            ) : eventos.length === 0 ? (
              <p className="detalhe-texto-sutil">Nenhum email enviado ainda.</p>
            ) : (
              <ul className="lista-eventos-email">
                {eventos.map((ev) => (
                  <li key={ev.id} className="evento-email">
                    <div className="evento-email-topo">
                      <span className={`evento-email-status ${ev.enviado_com_sucesso ? "ok" : "falha"}`}>
                        {ev.enviado_com_sucesso ? "Enviado" : "Falhou"}
                        {ev.modo_simulado && " (simulado)"}
                      </span>
                      <span className="evento-email-data">
                        {new Date(ev.criado_em).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="evento-email-assunto">{ev.assunto}</p>
                    <p className="evento-email-destinatario">para {ev.destinatario_email}</p>
                    {ev.erro && <p className="evento-email-erro">Erro: {ev.erro}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="painel-form-rodape painel-detalhe-rodape">
          <button type="button" className="btn-perigo" onClick={() => onExcluir(card.id)}>
            <Icon.Trash className="ic-pequeno" />
            Excluir
          </button>
        </footer>
      </div>

      {motivoAberto && (
        <div className="overlay overlay-motivo" role="dialog" aria-modal="true" aria-label="Motivo do cancelamento">
          <div className="overlay-backdrop" onClick={() => setMotivoAberto(false)} />
          <div className="painel-motivo">
            <h3>Motivo do cancelamento</h3>
            <p className="login-subtitulo">Isso vai entrar no email enviado ao solicitante.</p>
            <textarea
              className="textarea-motivo"
              rows={4}
              autoFocus
              value={motivoTexto}
              onChange={(e) => setMotivoTexto(e.target.value)}
              placeholder="Descreva o motivo…"
            />
            {motivoErro && <span className="campo-erro">{motivoErro}</span>}
            <div className="painel-motivo-acoes">
              <button type="button" className="btn-secundario" onClick={() => setMotivoAberto(false)}>
                Voltar
              </button>
              <button type="button" className="btn-primario" onClick={confirmarCancelamento}>
                Confirmar cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
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
