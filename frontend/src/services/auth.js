/**
 * Serviço de autenticação.
 *
 * MODO ATUAL (mock): não existe integração com Azure AD ainda. O "login"
 * é uma tela simples que pede nome e email, e guarda isso em
 * sessionStorage — simulando o que viria de uma sessão MSAL real.
 *
 * QUANDO INTEGRARMOS COM AZURE AD DE VERDADE (@azure/msal-browser):
 * As funções abaixo (obterUsuarioLogado, login, logout) são o único
 * contrato que o resto do app conhece. Substituir o conteúdo delas pelo
 * fluxo MSAL real (PublicClientApplication, loginPopup/loginRedirect,
 * getAllAccounts) não deve exigir mudança em nenhum componente — eles só
 * chamam essas três funções.
 */

const CHAVE_SESSAO = "cadastro-insumos:usuario";

export function obterUsuarioLogado() {
  try {
    const raw = sessionStorage.getItem(CHAVE_SESSAO);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function login({ nome, email }) {
  const usuario = { nome: nome.trim(), email: email.trim().toLowerCase() };
  sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(usuario));
  return usuario;
}

export function logout() {
  sessionStorage.removeItem(CHAVE_SESSAO);
}

/**
 * Headers de autenticação para as chamadas à API.
 * Hoje simula o token MSAL com headers simples lidos pelo backend mock
 * (ver core/auth.py). Quando integrarmos de verdade, isso vira um único
 * header Authorization: Bearer {token}.
 */
export function headersAutenticacao() {
  const usuario = obterUsuarioLogado();
  if (!usuario) return {};
  return {
    "X-User-Name": usuario.nome,
    "X-User-Email": usuario.email,
  };
}
