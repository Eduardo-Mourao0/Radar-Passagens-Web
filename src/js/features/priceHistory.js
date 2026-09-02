import { formatDateTime, formatMoney } from '../utils/formatters.js';
import { escapeHtml } from '../utils/strings.js';

const HISTORY_FILTERS = {
  latest: 'Últimas 10',
  month: 'Últimos 30 dias',
  all: 'Todo o histórico',
};
const LATEST_HISTORY_LIMIT = 10;
const THIRTY_DAYS_IN_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;

export function createPriceHistoryFeature({ dialog, content, routesApi }) {
  dialog.querySelector('.close-button').addEventListener('click', () => dialog.close());

  function normalizeHistoryFilter(activeFilter) {
    return Object.hasOwn(HISTORY_FILTERS, activeFilter) ? activeFilter : 'latest';
  }

  function filterHistory(history, activeFilter) {
    if (activeFilter === 'latest') return history.slice(0, LATEST_HISTORY_LIMIT);
    if (activeFilter === 'month') {
      const cutoff = Date.now() - THIRTY_DAYS_IN_MILLISECONDS;
      return history.filter((item) => new Date(item.coletadoEm).getTime() >= cutoff);
    }
    if (activeFilter === 'all') return history;
    throw new TypeError('Filtro de histórico inválido.');
  }

  function renderHistory(history, activeFilter) {
    const selectedFilter = normalizeHistoryFilter(activeFilter);
    const filteredHistory = filterHistory(history, selectedFilter);
    const filters = Object.entries(HISTORY_FILTERS)
      .map(
        ([filter, label]) =>
          `<button class="history-filter ${filter === selectedFilter ? 'active' : ''}" type="button" data-history-filter="${filter}" aria-pressed="${filter === selectedFilter}">${label}</button>`,
      )
      .join('');
    const historyContent = filteredHistory.length
      ? `<div class="history-list">${filteredHistory
          .map(
            (item) =>
              `<div class="history-row"><div><strong>${escapeHtml(formatMoney(item.preco, item.moeda))}</strong><p>${escapeHtml(item.companhia)}</p></div><time>${escapeHtml(formatDateTime(item.coletadoEm))}</time></div>`,
          )
          .join('')}</div>`
      : `<p class="history-empty">${
          selectedFilter === 'month'
            ? 'Não há coletas nos últimos 30 dias.'
            : 'Ainda não há preços coletados para esta rota.'
        }</p>`;

    content.innerHTML = `<div class="history-filters" role="group" aria-label="Período do histórico">${filters}</div>${historyContent}`;
    content.querySelectorAll('[data-history-filter]').forEach((button) => {
      button.addEventListener('click', () => renderHistory(history, button.dataset.historyFilter));
    });
  }

  return async function openHistory(id) {
    dialog.showModal();
    content.innerHTML = '<p class="loading">Carregando histórico...</p>';

    try {
      const history = [...(await routesApi.history(id))].sort(
        (a, b) => new Date(b.coletadoEm) - new Date(a.coletadoEm),
      );
      renderHistory(history, 'latest');
    } catch (error) {
      content.innerHTML = `<p class="history-empty">${escapeHtml(error.message)}</p>`;
    }
  };
}
