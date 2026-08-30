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

export const authApi = {
  startRegistration: (phone, pin) =>
    apiClient('/auth/cadastros', {
      method: 'POST',
      body: JSON.stringify({ telefone: phone, pin }),
      requiresAuth: false,
    }),
  verificationStatus: (id) => apiClient(`/auth/verificacoes/${id}`, { requiresAuth: false }),
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
