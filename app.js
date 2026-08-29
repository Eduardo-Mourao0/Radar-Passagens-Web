const airports = window.BRAZILIAN_AIRPORTS ?? [];
const grid = document.querySelector('#routes-grid');
const count = document.querySelector('#route-count');
const message = document.querySelector('#form-message');
const apiStatus = document.querySelector('#api-status');
let selectedRouteId = null;

const text = {
  actionError: 'N\u00e3o foi poss\u00edvel concluir esta a\u00e7\u00e3o.',
  unavailable: 'API indispon\u00edvel',
  loading: 'Carregando suas rotas\u2026',
  bookingLoading: 'Buscando links de reserva\u2026',
};

const money = (value, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value));
const formatDate = (value) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
const normalise = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

document.querySelector('#data-ida').min = new Date().toISOString().slice(0, 10);

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json', ...options.headers }, ...options });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || text.actionError);
  return body;
}

function setApiStatus(state, label) {
  apiStatus.className = `api-status ${state}`;
  apiStatus.querySelector('span').textContent = label;
}

function safeBookingUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function setupAirportSearch(name, listSelector) {
  const input = document.querySelector(`[name="${name}"]`);
  const list = document.querySelector(listSelector);
  const render = () => {
    const term = normalise(input.value.trim());
    const matches = term ? airports.filter((airport) => normalise(airport[0]).includes(term) || normalise(airport[1]).includes(term) || normalise(airport[2]).includes(term)).slice(0, 8) : [];
    list.innerHTML = matches.map((airport, index) => `<button class="suggestion" type="button" data-index="${index}"><span>${airport[0]}, ${airport[1]}</span><code>${airport[2]}</code></button>`).join('');
    list.classList.toggle('visible', matches.length > 0);
    list.querySelectorAll('button').forEach((button) => button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      const airport = matches[button.dataset.index];
      input.value = `${airport[0]} (${airport[2]})`;
      input.dataset.iata = airport[2];
      list.classList.remove('visible');
    }));
  };
  input.addEventListener('input', () => { delete input.dataset.iata; render(); });
  input.addEventListener('focus', render);
  input.addEventListener('blur', () => setTimeout(() => list.classList.remove('visible'), 120));
}

function renderRoutes(routes) {
  count.textContent = routes.length;
  if (!routes.length) {
    grid.innerHTML = '<div class="empty-state"><span>\u2311</span><h3>Nenhuma rota ainda</h3><p>Cadastre uma rota para come\u00e7ar a acompanhar os pre\u00e7os.</p></div>';
    return;
  }
  grid.innerHTML = routes.map((route) => {
    const price = route.historicos?.[0];
    const dates = `${formatDate(route.dataIda)}${route.dataVolta ? ` \u2014 ${formatDate(route.dataVolta)}` : ' \u00b7 somente ida'}`;
    const fare = price ? money(price.preco, price.moeda) : 'Aguardando coleta';
    const alertLabel = route.alertaPreco ? `\u25cf Alerta: at\u00e9 ${money(route.alertaPreco.precoAlvo)}` : '\u25cb Sem alerta configurado';
    return `<article class="route-card ${route.ativa ? '' : 'inactive'}"><div class="card-top"><div class="route-code">${route.origem}<span>\u2192</span>${route.destino}</div><span class="badge">${route.ativa ? 'ATIVA' : 'PAUSADA'}</span></div><p class="dates">${dates}</p><div class="price-line"><div><div class="price-label">\u00daLTIMA TARIFA</div><div class="price ${price ? '' : 'empty'}">${fare}</div></div>${price ? `<span class="price-label">${price.companhia}</span>` : ''}</div><p class="alert-status ${route.alertaPreco ? 'configured' : ''}" aria-label="${alertLabel}">${alertLabel}</p><div class="card-actions"><button data-action="history" data-id="${route.id}">Hist\u00f3rico</button><button data-action="alert" data-id="${route.id}" data-route="${route.origem} \u2192 ${route.destino}">Alerta</button><button data-action="booking" data-id="${route.id}">Ver passagem</button><button data-action="toggle" data-id="${route.id}" data-active="${route.ativa}">${route.ativa ? 'Pausar' : 'Reativar'}</button></div></article>`;
  }).join('');
}

async function loadRoutes() {
  grid.innerHTML = `<div class="loading">${text.loading}</div>`;
  try {
    const routes = await request('/rotas');
    const withHistory = await Promise.all(routes.map(async (route) => ({ ...route, historicos: await request(`/rotas/${route.id}/historico`).catch(() => []) })));
    setApiStatus('online', 'API conectada');
    renderRoutes(withHistory);
  } catch {
    setApiStatus('offline', text.unavailable);
    grid.innerHTML = '<div class="empty-state"><span>!</span><h3>N\u00e3o foi poss\u00edvel acessar a API</h3><p>Inicie o backend em <code>http://localhost:3000</code> e tente novamente.</p></div>';
  }
}

async function showBookingLinks(id) {
  const dialog = document.querySelector('#booking-dialog');
  const content = document.querySelector('#booking-content');
  dialog.showModal();
  content.innerHTML = `<p class="loading">${text.bookingLoading}</p>`;
  try {
    const links = await request(`/rotas/${id}/links-compra`);
    const options = links.map((link) => ({ ...link, url: safeBookingUrl(link.url) })).filter((link) => link.url);
    content.innerHTML = options.length ? `<div class="history-list">${options.map((link) => `<div class="history-row"><div><strong>${link.fornecedor}</strong><p>${link.tipoFornecedor === 'airline' ? 'Companhia a\u00e9rea' : 'Ag\u00eancia parceira'}</p></div><a class="booking-link" href="${link.url}" target="_blank" rel="noopener noreferrer">Abrir \u2197</a></div>`).join('')}</div>` : '<p class="history-empty">Nenhum link de compra est\u00e1 dispon\u00edvel.</p>';
  } catch (error) { content.innerHTML = `<p class="history-empty">${error.message}</p>`; }
}

async function showHistory(id) {
  const dialog = document.querySelector('#history-dialog');
  const content = document.querySelector('#history-content');
  dialog.showModal();
  content.innerHTML = '<p class="loading">Carregando hist\u00f3rico\u2026</p>';
  try {
    const history = await request(`/rotas/${id}/historico`);
    content.innerHTML = history.length ? `<div class="history-list">${history.map((item) => `<div class="history-row"><div><strong>${money(item.preco, item.moeda)}</strong><p>${item.companhia}</p></div><time>${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.coletadoEm))}</time></div>`).join('')}</div>` : '<p class="history-empty">Ainda n\u00e3o h\u00e1 pre\u00e7os coletados para esta rota.</p>';
  } catch (error) {
    content.innerHTML = `<p class="history-empty">${error.message}</p>`;
  }
}

function showAlert(id, route) {
  selectedRouteId = id;
  document.querySelector('#alert-title').textContent = `Meta para ${route}`;
  document.querySelector('#alert-message').textContent = '';
  document.querySelector('#target-price').value = '';
  document.querySelector('#alert-dialog').showModal();
}

document.querySelector('#route-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const origem = form.elements.origem.dataset.iata;
  const destino = form.elements.destino.dataset.iata;
  if (!origem || !destino) { message.textContent = 'Escolha uma cidade nas sugest\u00f5es para origem e destino.'; return; }
  if (origem === destino) { message.textContent = 'Origem e destino devem ser diferentes.'; return; }
  const body = Object.fromEntries(new FormData(form));
  body.origem = origem; body.destino = destino;
  if (!body.dataVolta) delete body.dataVolta;
  if (body.dataVolta && body.dataVolta < body.dataIda) { message.textContent = 'A data de volta n\u00e3o pode ser anterior \u00e0 ida.'; return; }
  const submitButton = form.querySelector('.primary-button');
  submitButton.disabled = true;
  submitButton.textContent = 'Salvando\u2026';
  try { await request('/rotas', { method: 'POST', body: JSON.stringify(body) }); form.reset(); message.textContent = 'Rota cadastrada e monitorada!'; await loadRoutes(); }
  catch (error) { message.textContent = error.message; }
  finally { submitButton.disabled = false; submitButton.innerHTML = 'Monitorar rota <span>\u2192</span>'; }
});

grid.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'booking') return showBookingLinks(id);
  if (action === 'history') return showHistory(id);
  if (action === 'alert') return showAlert(id, button.dataset.route);
  button.disabled = true;
  try {
    await request(`/rotas/${id}/${button.dataset.active === 'true' ? 'desativar' : 'reativar'}`, { method: 'PATCH' });
    await loadRoutes();
  } catch (error) {
    window.alert(error.message);
    button.disabled = false;
  }
});

document.querySelectorAll('.close-button').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelector('#alert-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const price = document.querySelector('#target-price').value.trim().replace(',', '.');
  try {
    await request(`/rotas/${selectedRouteId}/alerta-preco`, { method: 'PUT', body: JSON.stringify({ precoAlvo: price }) });
    document.querySelector('#alert-dialog').close();
    await loadRoutes();
  } catch (error) {
    document.querySelector('#alert-message').textContent = error.message;
  }
});
document.querySelector('#check-prices').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'Atualizando\u2026';
  try {
    await request('/rotas/verificar-precos', { method: 'POST' });
    await loadRoutes();
  } catch (error) {
    window.alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Atualizar pre\u00e7os \u21bb';
  }
});
if (airports.length) {
  setupAirportSearch('origem', '#origin-suggestions');
  setupAirportSearch('destino', '#destination-suggestions');
} else {
  console.warn('Cat\u00e1logo de aeroportos indispon\u00edvel.');
  document.querySelectorAll('[name="origem"], [name="destino"]').forEach((input) => { input.disabled = true; });
  document.querySelector('#route-form .primary-button').disabled = true;
  message.textContent = 'O cat\u00e1logo de aeroportos n\u00e3o foi carregado. Recarregue a p\u00e1gina para tentar novamente.';
}
loadRoutes();
window.addEventListener('routes:reload', loadRoutes);
