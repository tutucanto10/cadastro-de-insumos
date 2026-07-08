import { headersAutenticacao } from "./auth.js";

// Se VITE_API_BASE não for definido: em dev cai no backend local, em build
// de produção assume caminho relativo (mesma origem — caso do deploy único
// na Vercel, onde /api/* é servido pela função serverless no mesmo domínio).
// Defina VITE_API_BASE explicitamente se o backend estiver em outro domínio.
const API_BASE =
  import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? "http://localhost:8000" : "");

class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

async function chamarApi(caminho, opcoes = {}) {
  const headersAuth = await headersAutenticacao();
  const resposta = await fetch(`${API_BASE}${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      ...headersAuth,
      ...opcoes.headers,
    },
  });

  if (!resposta.ok) {
    let detalhe = `Erro ${resposta.status}`;
    try {
      const corpo = await resposta.json();
      detalhe = corpo.detail || detalhe;
    } catch {
      // resposta sem corpo JSON (ex.: 204), mantém a mensagem padrão
    }
    throw new ErroApi(detalhe, resposta.status);
  }

  if (resposta.status === 204) return null;
  return resposta.json();
}

export const api = {
  listarInsumos: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return chamarApi(`/api/insumos${query ? `?${query}` : ""}`);
  },

  criarInsumo: (dados) =>
    chamarApi("/api/insumos", {
      method: "POST",
      body: JSON.stringify(dados),
    }),

  mudarColuna: (id, coluna, motivoCancelamento) =>
    chamarApi(`/api/insumos/${id}/coluna`, {
      method: "PATCH",
      body: JSON.stringify({ coluna, motivo_cancelamento: motivoCancelamento }),
    }),

  mudarResponsavelChamado: (id, responsavelChamado) =>
    chamarApi(`/api/insumos/${id}/responsavel-chamado`, {
      method: "PATCH",
      body: JSON.stringify({ responsavel_chamado: responsavelChamado }),
    }),

  excluirInsumo: (id) =>
    chamarApi(`/api/insumos/${id}`, { method: "DELETE" }),

  listarEventosEmail: (insumoId) =>
    chamarApi(`/api/eventos-email?insumo_id=${insumoId}`),

  sincronizarSharepoint: () =>
    chamarApi("/api/sincronizacao/sharepoint", { method: "POST" }),

  verificarSaude: () => chamarApi("/api/saude"),
};

export { ErroApi };
