import { getAccessToken } from './session.js';

const DEFAULT_ERROR_MESSAGE = 'N\u00e3o foi poss\u00edvel concluir esta a\u00e7\u00e3o.';
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

let refreshSession;
let handleUnauthorized;

export function configureSession({ onRefresh, onUnauthorized }) {
  refreshSession = onRefresh;
  handleUnauthorized = onUnauthorized;
}

export async function apiClient(path, options = {}) {
  const { requiresAuth = true, retryOnUnauthorized = true, headers, ...requestOptions } = options;
  const accessToken = requiresAuth ? getAccessToken() : null;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    ...requestOptions,
  });

  if (response.status === 204) return null;

  const responseText = await response.text();
  let body = null;
  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch (error) {
      console.error('A API retornou uma resposta JSON inv\u00e1lida.', {
        path,
        status: response.status,
        error,
      });
      throw new Error('A API retornou uma resposta inv\u00e1lida. Tente novamente mais tarde.');
    }
  }

  if (
    response.status === 401 &&
    requiresAuth &&
    retryOnUnauthorized &&
    typeof refreshSession === 'function'
  ) {
    try {
      await refreshSession();
      return apiClient(path, { ...options, retryOnUnauthorized: false });
    } catch {
      handleUnauthorized?.();
    }
  }

  if (!response.ok) throw new Error(body?.message || DEFAULT_ERROR_MESSAGE);
  return body;
}
