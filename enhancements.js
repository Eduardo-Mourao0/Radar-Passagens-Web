(() => {
  let pendingDeletion = null;
  const addDeleteButtons = () => document.querySelectorAll('.card-actions').forEach((actions) => {
    if (actions.querySelector('.delete-button')) return;
    const routeId = actions.querySelector('[data-id]')?.dataset.id;
    if (!routeId) return;
    const button = document.createElement('button');
    button.className = 'delete-button';
    button.textContent = 'Excluir';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      pendingDeletion = { routeId, button };
      document.querySelector('#delete-dialog').showModal();
    });
    actions.append(button);
  });
  document.querySelector('#delete-form').addEventListener('submit', async (event) => {
    if (event.submitter.value !== 'confirm' || !pendingDeletion) return;
    const { routeId, button } = pendingDeletion;
    button.disabled = true;
    button.textContent = 'Excluindo\u2026';
    try {
      const response = await fetch(`/api/rotas/${routeId}`, { method: 'DELETE' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'N\u00e3o foi poss\u00edvel excluir a rota.');
      document.querySelector('#delete-dialog').close();
      window.dispatchEvent(new Event('routes:reload'));
    } catch (error) {
      window.alert(error.message);
      button.disabled = false;
      button.textContent = 'Excluir';
    } finally { pendingDeletion = null; }
  });
  new MutationObserver(addDeleteButtons).observe(document.querySelector('#routes-grid'), { childList: true });
  addDeleteButtons();
})();
