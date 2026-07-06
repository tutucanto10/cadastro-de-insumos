import React, { useState, useRef, useEffect } from "react";
import { Icon } from "./Icon.jsx";
import { FILTROS_LOCAL } from "../constants.js";

export default function FiltroLocal({ valor, onMudar }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function aoClicarFora(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const opcaoAtual = FILTROS_LOCAL.find((f) => f.id === valor) || FILTROS_LOCAL[0];

  return (
    <div className="filtro-local" ref={ref}>
      <button
        type="button"
        className={`filtro-local-botao ${valor ? "ativo" : ""}`}
        onClick={() => setAberto((a) => !a)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
      >
        <span>{opcaoAtual.titulo}</span>
        <Icon.ChevronDown className="ic-pequeno" />
      </button>

      {aberto && (
        <ul className="filtro-local-lista" role="listbox">
          {FILTROS_LOCAL.map((opcao) => (
            <li key={opcao.id}>
              <button
                type="button"
                className={`filtro-local-item ${valor === opcao.id ? "selecionado" : ""}`}
                role="option"
                aria-selected={valor === opcao.id}
                onClick={() => {
                  onMudar(opcao.id);
                  setAberto(false);
                }}
              >
                {opcao.titulo}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
