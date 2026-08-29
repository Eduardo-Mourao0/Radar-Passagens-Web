const DEFAULT_ERROR_MESSAGE = 'N\u00e3o foi poss\u00edvel concluir esta a\u00e7\u00e3o.';
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export async function apiClient(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
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

  if (!response.ok) throw new Error(body?.message || DEFAULT_ERROR_MESSAGE);
  return body;
}
