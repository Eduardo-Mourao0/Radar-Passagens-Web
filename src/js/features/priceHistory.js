import { formatDateTime, formatMoney } from '../utils/formatters.js';
import { escapeHtml } from '../utils/strings.js';

const HISTORY_LIMIT = 10;

export function createPriceHistoryFeature({ dialog, content, routesApi }) {
  dialog.querySelector('.close-button').addEventListener('click', () => dialog.close());

  return async function openHistory(id) {
    dialog.showModal();
    content.innerHTML = '<p class="loading">Carregando hist\u00f3rico\u2026</p>';

    try {
      const history = await routesApi.history(id);
      const recentHistory = [...history]
        .sort((a, b) => new Date(b.coletadoEm) - new Date(a.coletadoEm))
        .slice(0, HISTORY_LIMIT);
      content.innerHTML = recentHistory.length
        ? `<div class="history-list">${recentHistory
            .map(
              (item) =>
                `<div class="history-row"><div><strong>${escapeHtml(formatMoney(item.preco, item.moeda))}</strong><p>${escapeHtml(item.companhia)}</p></div><time>${escapeHtml(formatDateTime(item.coletadoEm))}</time></div>`,
            )
            .join('')}</div>`
        : '<p class="history-empty">Ainda n\u00e3o h\u00e1 pre\u00e7os coletados para esta rota.</p>';
    } catch (error) {
      content.innerHTML = `<p class="history-empty">${escapeHtml(error.message)}</p>`;
    }
  };
}
