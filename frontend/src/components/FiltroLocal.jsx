import React, { useState, useRef, useEffect } from "react";
import { Icon } from "./Icon.jsx";
import { FILTROS_LOCAL, OBRAS } from "../constants.js";

export default function FiltroLocal({ valor, obra, onMudar }) {
  const [aberto, setAberto] = useState(false);
  const [submenuObrasAberto, setSubmenuObrasAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function aoClicarFora(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setAberto(false);
        setSubmenuObrasAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const opcaoAtual = FILTROS_LOCAL.find((f) => f.id === valor) || FILTROS_LOCAL[0];
  const rotulo = obra ? `Obras > ${obra}` : opcaoAtual.titulo;

  const fechar = () => {
    setAberto(false);
    setSubmenuObrasAberto(false);
  };

  return (
    <div className="filtro-local" ref={ref}>
      <button
        type="button"
        className={`filtro-local-botao ${valor ? "ativo" : ""}`}
        onClick={() => setAberto((a) => !a)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
      >
        <span>{rotulo}</span>
        <Icon.ChevronDown className="ic-pequeno" />
      </button>

      {aberto && (
        <ul className="filtro-local-lista" role="listbox">
          {FILTROS_LOCAL.map((opcao) => {
            if (opcao.id !== "obra") {
              return (
                <li key={opcao.id}>
                  <button
                    type="button"
                    className={`filtro-local-item ${valor === opcao.id && !obra ? "selecionado" : ""}`}
                    role="option"
                    aria-selected={valor === opcao.id && !obra}
                    onClick={() => {
                      onMudar(opcao.id, "");
                      fechar();
                    }}
                  >
                    {opcao.titulo}
                  </button>
                </li>
              );
            }

            return (
              <li
                key="obra"
                className="filtro-local-submenu-wrap"
                onMouseEnter={() => setSubmenuObrasAberto(true)}
                onMouseLeave={() => setSubmenuObrasAberto(false)}
              >
                <button
                  type="button"
                  className={`filtro-local-item filtro-local-item-submenu ${
                    valor === "obra" && !obra ? "selecionado" : ""
                  }`}
                  role="option"
                  aria-selected={valor === "obra" && !obra}
                  aria-haspopup="listbox"
                  aria-expanded={submenuObrasAberto}
                  onClick={() => {
                    // no toque (sem hover, ex.: mobile) o clique direto seleciona
                    // "todas as obras"; quem quer uma obra específica usa o submenu
                    onMudar("obra", "");
                    fechar();
                  }}
                >
                  <span>{opcao.titulo}</span>
                  <Icon.ChevronDown className="ic-pequeno filtro-local-seta-submenu" />
                </button>

                {submenuObrasAberto && (
                  <ul className="filtro-local-lista filtro-local-submenu" role="listbox">
                    {OBRAS.map((nomeObra) => (
                      <li key={nomeObra}>
                        <button
                          type="button"
                          className={`filtro-local-item ${obra === nomeObra ? "selecionado" : ""}`}
                          role="option"
                          aria-selected={obra === nomeObra}
                          onClick={() => {
                            onMudar("obra", nomeObra);
                            fechar();
                          }}
                        >
                          {nomeObra}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
