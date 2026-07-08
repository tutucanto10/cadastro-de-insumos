import React from "react";
import { formatarDataBR, formatarHora } from "../constants.js";

export default function CardInsumo({ card, onAbrir, onArrastarInicio }) {
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
        <span className="card-local">{card.local_exibicao}</span>
      </div>
      <h3 className="card-nome">{card.nome_insumo}</h3>
      <p className="card-detalhes">{card.detalhes}</p>
      <div className="card-rodape">
        <span className="card-solicitante">
          <span className="avatar-mini">{card.solicitante_nome.charAt(0).toUpperCase()}</span>
          {card.solicitante_nome}
        </span>
        <span className="card-data" title="Horário em que o chamado entrou no sistema">
          {formatarDataBR(card.data_solicitacao)} · {formatarHora(card.criado_em)}
        </span>
      </div>
      {card.responsavel_chamado && (
        <div className="card-responsavel">
          <span className="avatar-mini">{card.responsavel_chamado.charAt(0).toUpperCase()}</span>
          Responsável: {card.responsavel_chamado}
        </div>
      )}
      {card.origem === "sharepoint" && (
        <div className="card-origem-tag" title="Importado da SharePoint List via Microsoft Forms">
          via SharePoint
        </div>
      )}
    </article>
  );
}
