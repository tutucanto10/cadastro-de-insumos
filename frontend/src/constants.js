export const OBRAS = [
  "Unic São Gonçalo",
  "LIV Primavera",
  "Unic Primavera",
  "Reserva Equitativa",
  "PRIME Caxias",
  "Seleto Inhaúma",
  "Seleto Primavera",
];

export const COLUNAS = [
  { id: "a-fazer", titulo: "A Fazer", cor: "#2563eb" },
  { id: "em-andamento", titulo: "Em Andamento", cor: "#d97706" },
  { id: "concluido", titulo: "Concluído", cor: "#059669" },
  { id: "cancelado", titulo: "Cancelado", cor: "#dc2626" },
];

export const RESPONSAVEIS_CHAMADO = ["Lucas Queiroz", "Mário César Guedes"];

// Mesmas opções da coluna "Obra(s)" da SharePoint List "Cadastro de
// Insumos" (site Engenharia-PlanejamentoeControle) — cópia fixa, não busca
// ao vivo. Se a lista de lá mudar, atualizar aqui também.
export const CENTROS_CUSTO = [
  "Domma Adm",
  "Domma T.I.",
  "Domma Comercial",
  "Domma Incorporação",
  "Reserva Equitativa",
  "Unic Primavera",
  "Unic São Gonçalo",
  "PRIME Caxias",
  "Liv Primavera",
  "Seleto Primavera",
  "Primavera 4 ltd - Incorporação",
  "SPE Inhaúma - Seleto Incorporação",
  "SPE São Gonçalo - Incorporação",
  "SPE Prime Caxias - Comercial",
  "Stand de Vendas - Caxias",
  "Stand de Vendas - São Gonçalo",
  "Stand de Vendas - Inhaúma",
];

export const FILTROS_LOCAL = [
  { id: "", titulo: "Todos os locais" },
  { id: "escritorio", titulo: "Escritório/Stand" },
  { id: "obra", titulo: "Obras" },
];

export const hojeISO = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

export const formatarDataBR = (iso) => {
  if (!iso) return "--";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
};
