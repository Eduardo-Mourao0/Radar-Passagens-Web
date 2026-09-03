import { apiClient } from './apiClient.js';

export const routesApi = {
  list: () => apiClient('/rotas'),
  create: (route) => apiClient('/rotas', { method: 'POST', body: JSON.stringify(route) }),
  history: (id) => apiClient(`/rotas/${id}/historico`),
  bookingLinks: (id) => apiClient(`/rotas/${id}/links-compra`),
  pause: (id) => apiClient(`/rotas/${id}/desativar`, { method: 'PATCH' }),
  activate: (id) => apiClient(`/rotas/${id}/reativar`, { method: 'PATCH' }),
  delete: (id) => apiClient(`/rotas/${id}`, { method: 'DELETE' }),
  updatePriceAlert: (id, price) =>
    apiClient(`/rotas/${id}/alerta-preco`, {
      method: 'PUT',
      body: JSON.stringify({ precoAlvo: price }),
    }),
  refreshPrice: (id) => apiClient(`/rotas/${id}/verificar-preco`, { method: 'POST' }),
};
