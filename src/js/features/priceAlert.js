export function createPriceAlertFeature({
  dialog,
  form,
  message,
  title,
  priceInput,
  routesApi,
  onSaved,
}) {
  let selectedRouteId = null;

  dialog.querySelector('.close-button').addEventListener('click', () => dialog.close());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const price = priceInput.value.trim().replace(',', '.');

    try {
      await routesApi.updatePriceAlert(selectedRouteId, price);
      dialog.close();
      await onSaved();
    } catch (error) {
      message.textContent = error.message;
    }
  });

  return function openPriceAlert(id, route) {
    selectedRouteId = id;
    title.textContent = `Meta para ${route}`;
    message.textContent = '';
    priceInput.value = '';
    dialog.showModal();
  };
}
