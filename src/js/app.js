import { routesApi } from './api/routesApi.js';
import { setupAirportAutocomplete } from './components/airportAutocomplete.js';
import { airports } from './data/airports.js';
import { createBookingFeature } from './features/booking.js';
import { createPriceAlertFeature } from './features/priceAlert.js';
import { createPriceHistoryFeature } from './features/priceHistory.js';
import { createRoutesFeature } from './features/routes.js';

const elements = {
  form: document.querySelector('#route-form'),
  formMessage: document.querySelector('#form-message'),
  grid: document.querySelector('#routes-grid'),
  count: document.querySelector('#route-count'),
  apiStatus: document.querySelector('#api-status'),
  checkPricesButton: document.querySelector('#check-prices'),
  deleteDialog: document.querySelector('#delete-dialog'),
  deleteForm: document.querySelector('#delete-form'),
};

function setupAirportSearch() {
  if (!airports.length) {
    console.warn('Cat\u00e1logo de aeroportos indispon\u00edvel.');
    document.querySelectorAll('[name="origem"], [name="destino"]').forEach((input) => {
      input.disabled = true;
    });
    elements.form.querySelector('.primary-button').disabled = true;
    elements.formMessage.textContent =
      'O cat\u00e1logo de aeroportos n\u00e3o foi carregado. Recarregue a p\u00e1gina para tentar novamente.';
    return;
  }

  setupAirportAutocomplete({
    input: elements.form.elements.origem,
    list: document.querySelector('#origin-suggestions'),
    airports,
  });
  setupAirportAutocomplete({
    input: elements.form.elements.destino,
    list: document.querySelector('#destination-suggestions'),
    airports,
  });
}

function init() {
  document.querySelector('#data-ida').min = new Date().toISOString().slice(0, 10);
  setupAirportSearch();

  const openBooking = createBookingFeature({
    dialog: document.querySelector('#booking-dialog'),
    content: document.querySelector('#booking-content'),
    routesApi,
  });
  const openHistory = createPriceHistoryFeature({
    dialog: document.querySelector('#history-dialog'),
    content: document.querySelector('#history-content'),
    routesApi,
  });

  let routesFeature;
  const openPriceAlert = createPriceAlertFeature({
    dialog: document.querySelector('#alert-dialog'),
    form: document.querySelector('#alert-form'),
    message: document.querySelector('#alert-message'),
    title: document.querySelector('#alert-title'),
    priceInput: document.querySelector('#target-price'),
    routesApi,
    onSaved: () => routesFeature.loadRoutes(),
  });
  routesFeature = createRoutesFeature({
    elements,
    routesApi,
    onBooking: openBooking,
    onHistory: openHistory,
    onAlert: openPriceAlert,
  });

  routesFeature.setup();
  routesFeature.loadRoutes();
}

init();
