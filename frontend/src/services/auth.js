/**
 * Serviço de autenticação — login real via Microsoft (MSAL, redirecionamento
 * de página inteira).
 *
 * O contrato (obterUsuarioLogado, login, logout, headersAutenticacao) é o
 * único jeito que o resto do app conhece o usuário logado — nenhum
 * componente fala com o MSAL diretamente.
 */

import { PublicClientApplication } from "@azure/msal-browser";

const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID;
const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID;
const ESCOPOS = ["User.Read"];

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
});

let promessaInicializacao = null;
function garantirInicializado() {
  if (!promessaInicializacao) promessaInicializacao = msalInstance.initialize();
  return promessaInicializacao;
}

// Precisa rodar só uma vez por carregamento de página — em dev, o
// React.StrictMode chama o useEffect que dispara isso duas vezes, e
// invocar handleRedirectPromise duas vezes concorrentemente confunde o MSAL.
let promessaRedirect = null;
function processarRedirectUmaVez() {
  if (!promessaRedirect) {
    promessaRedirect = msalInstance.handleRedirectPromise().catch(() => null);
  }
  return promessaRedirect;
}

function contaParaUsuario(conta) {
  if (!conta) return null;
  return { nome: conta.name || conta.username, email: conta.username };
}

export async function obterUsuarioLogado() {
  await garantirInicializado();
  const resultado = await processarRedirectUmaVez();

  if (resultado?.account) {
    msalInstance.setActiveAccount(resultado.account);
    return contaParaUsuario(resultado.account);
  }

  const contas = msalInstance.getAllAccounts();
  if (contas.length === 0) return null;

  msalInstance.setActiveAccount(contas[0]);
  return contaParaUsuario(contas[0]);
}

/**
 * Redireciona a página inteira pra Microsoft. Não retorna nada útil — a
 * aba navega pra fora antes da Promise resolver. Depois do login, a
 * Microsoft volta pro app e `obterUsuarioLogado` (chamado no mount)
 * processa o resultado.
 */
export async function login() {
  await garantirInicializado();
  await msalInstance.loginRedirect({ scopes: ESCOPOS });
}

export async function logout() {
  await garantirInicializado();
  const conta = msalInstance.getActiveAccount();
  await msalInstance.logoutRedirect({ account: conta });
}

/**
 * Headers de autenticação pras chamadas à API: adquire (silenciosamente,
 * sem navegar a página) um ID token válido e manda como Bearer.
 */
export async function headersAutenticacao() {
  await garantirInicializado();
  const conta = msalInstance.getActiveAccount();
  if (!conta) return {};

  try {
    const resultado = await msalInstance.acquireTokenSilent({ scopes: ESCOPOS, account: conta });
    return { Authorization: `Bearer ${resultado.idToken}` };
  } catch {
    return {};
  }
}
