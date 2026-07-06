import React, { useEffect, useState } from "react";
import { Icon } from "./Icon.jsx";
import { COLUNAS, formatarDataBR } from "../constants.js";

export default function DetalheCard({ card, onFechar, onMudarColuna, onExcluir, buscarEventosEmail }) {
  const [eventos, setEventos] = useState([]);
  const [carregandoEventos, setCarregandoEventos] = useState(false);

  useEffect(() => {
    if (!card) return;
    setCarregandoEventos(true);
    buscarEventosEmail(card.id)
      .then(setEventos)
      .catch(() => setEventos([]))
      .finally(() => setCarregandoEventos(false));
  }, [card, buscarEventosEmail]);

  if (!card) return null;

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
            <DetalheItem icone={<Icon.User className="ic-pequeno" />} rotulo="Responsável" valor={card.responsavel_nome || "Ainda não atribuído"} />
            <DetalheItem icone={<Icon.User className="ic-pequeno" />} rotulo="Responsável pelo chamado" valor={card.responsavel_chamado || "—"} />
            <DetalheItem icone={<Icon.Calendar className="ic-pequeno" />} rotulo="Data" valor={formatarDataBR(card.data_solicitacao)} />
          </div>

          <div className="detalhe-bloco">
            <span className="detalhe-rotulo">Email do solicitante</span>
            <p className="detalhe-texto">{card.solicitante_email}</p>
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
