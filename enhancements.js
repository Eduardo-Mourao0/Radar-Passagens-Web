(() => {
  const airports = window.BRAZILIAN_AIRPORTS ?? [];
  let pendingDeletion = null;
  const normalise = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  ['origem', 'destino'].forEach((name) => {
    const input = document.querySelector(`[name="${name}"]`);
    const list = document.querySelector(name === 'origem' ? '#origin-suggestions' : '#destination-suggestions');
    const render = () => {
      const term = normalise(input.value.trim());
      const matches = term ? airports.filter((airport) => airport.some((value) => normalise(value).includes(term))).slice(0, 8) : [];
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
  });

  const addBookingButtons = () => document.querySelectorAll('.card-actions').forEach((actions) => {
    if (actions.querySelector('.delete-button')) return;
    const routeId = actions.querySelector('[data-id]')?.dataset.id;
    if (!routeId) return;
    if (!actions.querySelector('[data-action="booking"]')) {
    const button = document.createElement('button');
    button.className = 'booking-button';
    button.textContent = 'Ver passagem';
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const dialog = document.querySelector('#booking-dialog');
      const content = document.querySelector('#booking-content');
      dialog.showModal(); content.innerHTML = '<p class="loading">Buscando links de reserva…</p>';
      try {
        const response = await fetch(`/api/rotas/${routeId}/links-compra`);
        const links = await response.json();
        if (!response.ok) throw new Error(links.message || 'Não foi possível buscar links de compra.');
        content.innerHTML = links.length ? `<div class="history-list">${links.map((link) => `<div class="history-row"><div><strong>${link.fornecedor}</strong><p>${link.tipoFornecedor === 'airline' ? 'Companhia aérea' : 'Agência parceira'}</p></div><a class="booking-link" href="${link.url.startsWith('http') ? link.url : `https://${link.url}`}" target="_blank" rel="noopener noreferrer">Abrir ↗</a></div>`).join('')}</div>` : '<p class="history-empty">Nenhum link de compra está disponível.</p>';
      } catch (error) { content.innerHTML = `<p class="history-empty">${error.message}</p>`; }
    });
    actions.append(button);
    }

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.textContent = 'Excluir';
    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      pendingDeletion = { routeId, deleteButton };
      document.querySelector('#delete-dialog').showModal();
    });
    actions.append(deleteButton);
  });

  new MutationObserver(addBookingButtons).observe(document.querySelector('#routes-grid'), { childList: true, subtree: true });
  document.querySelector('#delete-form').addEventListener('submit', async (event) => {
    if (event.submitter.value !== 'confirm' || !pendingDeletion) return;
    const { routeId, deleteButton } = pendingDeletion;
    deleteButton.disabled = true;
    deleteButton.textContent = 'Excluindo\u2026';
    try {
      const response = await fetch(`/api/rotas/${routeId}`, { method: 'DELETE' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'N\u00e3o foi poss\u00edvel excluir a rota.');
      window.location.reload();
    } catch (error) {
      window.alert(error.message);
      deleteButton.disabled = false;
      deleteButton.textContent = 'Excluir';
    } finally {
      pendingDeletion = null;
    }
  });
  addBookingButtons();
})();
