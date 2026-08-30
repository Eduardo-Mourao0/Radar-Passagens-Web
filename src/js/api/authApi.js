import { apiClient } from './apiClient.js';
import { clearAccessToken, saveAccessToken } from './session.js';

async function storeSession(request) {
  const session = await request();
  if (!session?.accessToken || typeof session.accessToken !== 'string') {
    throw new Error('A API não retornou um token de acesso válido.');
  }
  saveAccessToken(session.accessToken);
  return session;
}

function validateVerification(verification) {
  if (
    !verification ||
    typeof verification.id !== 'string' ||
    typeof verification.expiraEm !== 'string' ||
    typeof verification.urlTelegram !== 'string'
  ) {
    throw new Error('A API não retornou os dados necessários para confirmar no Telegram.');
  }
  return verification;
}

export const authApi = {
  startRegistration: (phone, pin) =>
    apiClient('/auth/cadastros', {
      method: 'POST',
      body: JSON.stringify({ telefone: phone, pin }),
      requiresAuth: false,
    }).then(validateVerification),
  startRecovery: (phone) =>
    apiClient('/auth/recuperacoes', {
      method: 'POST',
      body: JSON.stringify({ telefone: phone }),
      requiresAuth: false,
    }).then(validateVerification),
  verificationStatus: (id) => apiClient(`/auth/verificacoes/${id}`, { requiresAuth: false }),
  confirmVerification: (id, code) =>
    apiClient(`/auth/verificacoes/${id}/confirmar`, {
      method: 'POST',
      body: JSON.stringify({ codigo: code }),
      requiresAuth: false,
    }),
  resetPin: (tokenRedefinicao, pin) =>
    apiClient('/auth/redefinir-senha', {
      method: 'POST',
      body: JSON.stringify({ tokenRedefinicao, pin }),
      requiresAuth: false,
    }),
  login: (phone, pin) =>
    storeSession(() =>
      apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ telefone: phone, pin }),
        requiresAuth: false,
      }),
    ),
  refresh: () =>
    storeSession(() =>
      apiClient('/auth/refresh', {
        method: 'POST',
        requiresAuth: false,
      }),
    ),
  async logout() {
    try {
      await apiClient('/auth/logout', { method: 'POST', requiresAuth: false });
    } finally {
      clearAccessToken();
    }
  },
};
