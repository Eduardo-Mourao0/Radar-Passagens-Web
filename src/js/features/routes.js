import { createRouteCard } from '../components/routeCard.js';
import { validateRoute } from '../utils/validators.js';

const PRICE_REFRESH_INTERVAL = 60 * 60 * 1000;
const PRICE_REFRESH_STORAGE_KEY = 'radar-passagens:last-price-refresh';

export function createRoutesFeature({ elements, routesApi, onBooking, onHistory, onAlert }) {
  const { form, formMessage, grid, count, apiStatus, checkPricesButton, deleteDialog, deleteForm } =
    elements;
  let pendingDeletion = null;
  let priceRefreshTimer;
  const errorMessage = (error, fallback) => error?.message || fallback;

  function formatRemainingTime(milliseconds) {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  function getPriceRefreshRemainingTime() {
    const lastRefresh = Number(window.localStorage.getItem(PRICE_REFRESH_STORAGE_KEY));
    const remainingTime = lastRefresh + PRICE_REFRESH_INTERVAL - Date.now();
    if (!Number.isFinite(lastRefresh) || remainingTime <= 0) {
      window.localStorage.removeItem(PRICE_REFRESH_STORAGE_KEY);
      return 0;
    }
    return remainingTime;
  }

  function updatePriceRefreshButton() {
    const remainingTime = getPriceRefreshRemainingTime();
    if (!remainingTime) {
      checkPricesButton.disabled = false;
      checkPricesButton.textContent = 'Atualizar preços ↻';
      checkPricesButton.removeAttribute('title');
      window.clearInterval(priceRefreshTimer);
      priceRefreshTimer = undefined;
      return;
    }

    const remainingLabel = formatRemainingTime(remainingTime);
    checkPricesButton.disabled = true;
    checkPricesButton.textContent = `Atualizar em ${remainingLabel}`;
    checkPricesButton.title = `Disponível novamente em ${remainingLabel}`;
    if (!priceRefreshTimer) {
      priceRefreshTimer = window.setInterval(updatePriceRefreshButton, 1000);
    }
  }

  function mensagemCotacaoInicial(situacaoCotacao, acao) {
    if (situacaoCotacao === 'ATUALIZADA') return `${acao} e cotação atualizada!`;
    if (situacaoCotacao === 'SEM_OFERTA') {
      return `${acao}, mas ainda não há oferta disponível para essa rota.`;
    }
    if (situacaoCotacao === 'INDISPONIVEL') {
      return `${acao}, mas a cotação inicial está indisponível. Tentaremos novamente automaticamente.`;
    }
    return `${acao}!`;
  }

  function setApiStatus(state, label) {
    apiStatus.className = `api-status ${state}`;
    apiStatus.querySelector('span').textContent = label;
  }

  function renderRoutes(routes) {
    count.textContent = routes.length;
    if (!routes.length) {
      grid.innerHTML =
        '<div class="empty-state"><span>\u2311</span><h3>Nenhuma rota ainda</h3><p>Cadastre uma rota para come\u00e7ar a acompanhar os pre\u00e7os.</p></div>';
      return;
    }
    grid.innerHTML = routes.map(createRouteCard).join('');
  }

  async function loadRoutes() {
    grid.innerHTML = '<div class="loading">Carregando suas rotas\u2026</div>';
    try {
      const routes = await routesApi.list();
      const routesWithHistory = await Promise.all(
        routes.map(async (route) => ({
          ...route,
          historicos: await routesApi.history(route.id).catch(() => []),
        })),
      );
      setApiStatus('online', 'API conectada');
      renderRoutes(routesWithHistory);
    } catch {
      setApiStatus('offline', 'API indispon\u00edvel');
      grid.innerHTML =
        '<div class="empty-state"><span>!</span><h3>N\u00e3o foi poss\u00edvel acessar a API</h3><p>Inicie o backend em <code>http://localhost:3000</code> e tente novamente.</p></div>';
    }
  }

  async function handleRouteSubmit(event) {
    event.preventDefault();
    formMessage.textContent = '';
    const origin = form.elements.origem.dataset.iata;
    const destination = form.elements.destino.dataset.iata;
    const data = Object.fromEntries(new FormData(form));
    const validationError = validateRoute({
      origin,
      destination,
      departureDate: data.dataIda,
      returnDate: data.dataVolta,
    });
    if (validationError) {
      formMessage.textContent = validationError;
      return;
    }

    const submitButton = form.querySelector('.primary-button');
    const route = { ...data, origem: origin, destino: destination };
    if (!route.dataVolta) delete route.dataVolta;
    submitButton.disabled = true;
    submitButton.textContent = 'Salvando\u2026';
    try {
      const rotaCriada = await routesApi.create(route);
      form.reset();
      delete form.elements.origem.dataset.iata;
      delete form.elements.destino.dataset.iata;
      formMessage.textContent = mensagemCotacaoInicial(
        rotaCriada.situacaoCotacao,
        'Rota cadastrada',
      );
      await loadRoutes();
    } catch (error) {
      formMessage.textContent = error.message;
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Monitorar rota <span>\u2192</span>';
    }
  }

  async function handleRouteAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;

    if (action === 'booking') return onBooking(id);
    if (action === 'history') return onHistory(id);
    if (action === 'alert') return onAlert(id, button.dataset.route);
    if (action === 'delete') {
      pendingDeletion = { id, button };
      deleteDialog.showModal();
      return;
    }

    button.disabled = true;
    try {
      const rotaAtualizada = await (button.dataset.active === 'true'
        ? routesApi.pause(id)
        : routesApi.activate(id));
      await loadRoutes();
      if (
        button.dataset.active !== 'true' &&
        rotaAtualizada.situacaoCotacao !== 'ATUALIZADA'
      ) {
        window.alert(
          mensagemCotacaoInicial(rotaAtualizada.situacaoCotacao, 'Rota reativada'),
        );
      }
    } catch (error) {
      window.alert(errorMessage(error, 'N\u00e3o foi poss\u00edvel concluir esta a\u00e7\u00e3o.'));
      button.disabled = false;
    }
  }

  async function handleDeleteSubmit(event) {
    if (!event.submitter?.matches('[data-confirm-delete]') || !pendingDeletion) return;
    event.preventDefault();
    const { id, button } = pendingDeletion;
    button.disabled = true;
    button.textContent = 'Excluindo\u2026';
    try {
      await routesApi.delete(id);
      deleteDialog.close();
      await loadRoutes();
    } catch (error) {
      window.alert(errorMessage(error, 'N\u00e3o foi poss\u00edvel excluir a rota.'));
      button.disabled = false;
      button.textContent = 'Excluir';
    } finally {
      pendingDeletion = null;
    }
  }

  async function handlePriceRefresh(event) {
    const button = event.currentTarget;
    if (getPriceRefreshRemainingTime()) {
      updatePriceRefreshButton();
      return;
    }

    button.disabled = true;
    button.textContent = 'Atualizando\u2026';
    try {
      await routesApi.refreshPrices();
      window.localStorage.setItem(PRICE_REFRESH_STORAGE_KEY, String(Date.now()));
      await loadRoutes();
    } catch (error) {
      window.alert(errorMessage(error, 'N\u00e3o foi poss\u00edvel atualizar os pre\u00e7os.'));
    } finally {
      updatePriceRefreshButton();
    }
  }

  function setup() {
    form.addEventListener('submit', handleRouteSubmit);
    grid.addEventListener('click', handleRouteAction);
    deleteForm.addEventListener('submit', handleDeleteSubmit);
    deleteDialog.addEventListener('close', () => {
      pendingDeletion = null;
    });
    checkPricesButton.addEventListener('click', handlePriceRefresh);
    window.addEventListener('storage', (event) => {
      if (event.key === PRICE_REFRESH_STORAGE_KEY) updatePriceRefreshButton();
    });
    updatePriceRefreshButton();
  }

  return { loadRoutes, setup };
}
