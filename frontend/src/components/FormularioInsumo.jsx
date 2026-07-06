import React, { useState, useEffect } from "react";
import { Icon } from "./Icon.jsx";
import { OBRAS, RESPONSAVEIS_CHAMADO, hojeISO } from "../constants.js";

const ETAPA = { LOCAL_TIPO: "local-tipo", LOCAL_OBRA: "local-obra", DETALHES: "detalhes" };

function formVazio(usuario) {
  return {
    nomeInsumo: "",
    unidadeMedida: "",
    tipoLocal: "",
    obraEscolhida: "",
    detalhes: "",
    marca: "",
    aplicacao: "",
    responsavelChamado: "",
    solicitanteNome: usuario?.nome || "",
    solicitanteEmail: usuario?.email || "",
    data: hojeISO(),
  };
}

function localFinal(form) {
  if (form.tipoLocal === "escritorio") return "Escritório/Stand";
  if (form.tipoLocal === "obra") return form.obraEscolhida;
  return "";
}

export default function FormularioInsumo({ aberto, usuario, onFechar, onCriar }) {
  const [etapa, setEtapa] = useState(ETAPA.LOCAL_TIPO);
  const [form, setForm] = useState(() => formVazio(usuario));
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");

  useEffect(() => {
    if (aberto) {
      setEtapa(ETAPA.LOCAL_TIPO);
      setForm(formVazio(usuario));
      setErros({});
      setErroEnvio("");
    }
  }, [aberto, usuario]);

  if (!aberto) return null;

  const escolherTipoLocal = (tipo) => {
    setForm((f) => ({ ...f, tipoLocal: tipo, obraEscolhida: "" }));
    setEtapa(tipo === "escritorio" ? ETAPA.DETALHES : ETAPA.LOCAL_OBRA);
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
    if (!form.aplicacao.trim()) novosErros.aplicacao = "Informe o centro de custo.";
    if (!form.responsavelChamado) novosErros.responsavelChamado = "Selecione o responsável pelo chamado.";
    if (!form.solicitanteNome.trim()) novosErros.solicitanteNome = "Informe o nome do solicitante.";
    if (!form.solicitanteEmail.trim()) {
      novosErros.solicitanteEmail = "Informe o email do solicitante.";
    } else if (!form.solicitanteEmail.includes("@")) {
      novosErros.solicitanteEmail = "Informe um email válido.";
    }
    if (!form.data) novosErros.data = "Selecione a data.";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const submeter = async (e) => {
    e.preventDefault();
    if (!validar()) return;

    setEnviando(true);
    setErroEnvio("");
    try {
      await onCriar({
        nome_insumo: form.nomeInsumo.trim(),
        unidade_medida: form.unidadeMedida.trim(),
        tipo_local: form.tipoLocal,
        obra: form.tipoLocal === "obra" ? form.obraEscolhida : null,
        detalhes: form.detalhes.trim(),
        marca: form.marca.trim() || null,
        aplicacao: form.aplicacao.trim(),
        responsavel_chamado: form.responsavelChamado,
        solicitante_nome: form.solicitanteNome.trim(),
        solicitante_email: form.solicitanteEmail.trim(),
        data_solicitacao: form.data,
      });
    } catch (err) {
      setErroEnvio(err.message || "Não foi possível cadastrar o insumo. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const atualizar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

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
                  setEtapa(
                    etapa === ETAPA.DETALHES && form.tipoLocal === "obra"
                      ? ETAPA.LOCAL_OBRA
                      : ETAPA.LOCAL_TIPO
                  )
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

        <div className="trilha" aria-hidden="true">
          <span className="trilha-passo ativo" />
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

              <Campo label="Centro de Custo" obrigatorio erro={erros.aplicacao}>
                <input type="text" value={form.aplicacao} onChange={atualizar("aplicacao")} placeholder="Ex.: Obra" />
              </Campo>

              <span className={`tag-categoria-local ${form.tipoLocal}`}>
                <Icon.Tag className="ic-pequeno" />
                {form.tipoLocal === "escritorio" ? "Escritório/Stand" : "Obras"}
              </span>

              <Campo label="Responsável pelo chamado" obrigatorio erro={erros.responsavelChamado}>
                <select value={form.responsavelChamado} onChange={atualizar("responsavelChamado")}>
                  <option value="">Selecione…</option>
                  {RESPONSAVEIS_CHAMADO.map((nome) => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))}
                </select>
              </Campo>

              <div className="campo-linha">
                <Campo label="Solicitante" obrigatorio erro={erros.solicitanteNome}>
                  <input
                    type="text"
                    value={form.solicitanteNome}
                    onChange={atualizar("solicitanteNome")}
                  />
                </Campo>
                <Campo label="Data" obrigatorio erro={erros.data}>
                  <input type="date" value={form.data} onChange={atualizar("data")} />
                </Campo>
              </div>

              <Campo label="Email do Solicitante" obrigatorio erro={erros.solicitanteEmail}>
                <input
                  type="email"
                  value={form.solicitanteEmail}
                  onChange={atualizar("solicitanteEmail")}
                  placeholder="voce@dommainc.com.br"
                />
                <span className="campo-ajuda">
                  Usado para enviar os avisos automáticos de andamento da solicitação.
                </span>
              </Campo>

              {erroEnvio && <div className="alerta-erro">{erroEnvio}</div>}

              <footer className="painel-form-rodape">
                <button type="button" className="btn-secundario" onClick={onFechar} disabled={enviando}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primario" disabled={enviando}>
                  {enviando ? "Cadastrando…" : "Cadastrar insumo"}
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
