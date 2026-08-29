import { escapeHtml } from '../utils/strings.js';
import { safeBookingUrl } from '../utils/validators.js';

export function createBookingFeature({ dialog, content, routesApi }) {
  dialog.querySelector('.close-button').addEventListener('click', () => dialog.close());

  return async function openBooking(id) {
    dialog.showModal();
    content.innerHTML = '<p class="loading">Buscando links de reserva\u2026</p>';

    try {
      const links = await routesApi.bookingLinks(id);
      const options = links.map((link) => ({ ...link, url: safeBookingUrl(link.url) }));
      const validOptions = options.filter((link) => link.url);
      const invalidLinkCount = options.length - validOptions.length;
      if (invalidLinkCount)
        console.warn(
          `${invalidLinkCount} link(s) de compra foram ocultados por URL inv\u00e1lida.`,
        );

      content.innerHTML = validOptions.length
        ? `<div class="history-list">${validOptions
            .map(
              (link) =>
                `<div class="history-row"><div><strong>${escapeHtml(link.fornecedor)}</strong><p>${link.tipoFornecedor === 'airline' ? 'Companhia a\u00e9rea' : 'Ag\u00eancia parceira'}</p></div><a class="booking-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">Abrir \u2197</a></div>`,
            )
            .join('')}</div>`
        : '<p class="history-empty">Nenhum link de compra est\u00e1 dispon\u00edvel.</p>';
    } catch (error) {
      content.innerHTML = `<p class="history-empty">${escapeHtml(error.message)}</p>`;
    }
  };
}
