import { formatDate, formatMoney } from '../utils/formatters.js';
import { escapeHtml } from '../utils/strings.js';
import { getAirportCity } from '../data/airports.js';

export function createRouteCard(route) {
  const price = route.ultimoPreco ?? route.historicos?.[0];
  const dates = `${formatDate(route.dataIda)}${route.dataVolta ? ` \u2014 ${formatDate(route.dataVolta)}` : ' \u00b7 somente ida'}`;
  const fare = price ? formatMoney(price.preco, price.moeda) : 'Aguardando coleta';
  const alertLabel = route.alertaPreco
    ? `\u25cf Alerta: at\u00e9 ${formatMoney(route.alertaPreco.precoAlvo)}`
    : '\u25cb Sem alerta configurado';
  const origin = escapeHtml(route.origem);
  const destination = escapeHtml(route.destino);
  const originCity = getAirportCity(route.origem);
  const destinationCity = getAirportCity(route.destino);

  return `
    <article class="route-card ${route.ativa ? '' : 'inactive'}">
      <div class="card-top">
        <div class="route-code">
          <div class="route-airport">
            ${originCity ? `<span class="route-city">${escapeHtml(originCity)}</span>` : ''}
            <span class="route-iata">${origin}</span>
          </div>
          <span class="route-arrow">\u2192</span>
          <div class="route-airport">
            ${destinationCity ? `<span class="route-city">${escapeHtml(destinationCity)}</span>` : ''}
            <span class="route-iata">${destination}</span>
          </div>
        </div>
        <span class="badge">${route.ativa ? 'ATIVA' : 'PAUSADA'}</span>
      </div>
      <p class="dates">${escapeHtml(dates)}</p>
      <div class="price-line">
        <div>
          <div class="price-label">\u00daLTIMA TARIFA</div>
          <div class="price ${price ? '' : 'empty'}">${escapeHtml(fare)}</div>
        </div>
        ${price ? `<span class="price-label">${escapeHtml(price.companhia)}</span>` : ''}
      </div>
      <p class="alert-status ${route.alertaPreco ? 'configured' : ''}">${alertLabel}</p>
      <div class="card-actions">
        <button data-action="history" data-id="${escapeHtml(route.id)}">Hist\u00f3rico</button>
        <button data-action="alert" data-id="${escapeHtml(route.id)}" data-route="${origin} \u2192 ${destination}">Alerta</button>
        <button data-action="booking" data-id="${escapeHtml(route.id)}">Ver passagem</button>
        <button data-action="toggle" data-id="${escapeHtml(route.id)}" data-active="${route.ativa}">${route.ativa ? 'Pausar' : 'Reativar'}</button>
        <button class="delete-button" data-action="delete" data-id="${escapeHtml(route.id)}">Excluir</button>
      </div>
    </article>
  `;
}
