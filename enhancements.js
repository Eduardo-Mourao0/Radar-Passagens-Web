(() => {
  let pendingDeletion = null;
  let updateScheduled = false;
  const deleteDialog = document.querySelector('#delete-dialog');
  const deleteForm = document.querySelector('#delete-form');

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
      deleteDialog.showModal();
    });
    actions.append(button);
  });
  deleteForm.addEventListener('submit', async (event) => {
    if (!event.submitter?.matches('[data-confirm-delete]') || !pendingDeletion) return;
    event.preventDefault();
    const { routeId, button } = pendingDeletion;
    button.disabled = true;
    button.textContent = 'Excluindo\u2026';
    try {
      const response = await fetch(`/api/rotas/${routeId}`, { method: 'DELETE' });
      const body = await response.json().catch((error) => {
        console.error('A API retornou uma resposta inv\u00e1lida ao excluir a rota.', error);
        return null;
      });
      if (!response.ok) throw new Error(body?.message || 'N\u00e3o foi poss\u00edvel excluir a rota.');
      deleteDialog.close();
      window.dispatchEvent(new Event('routes:reload'));
    } catch (error) {
      window.alert(error.message);
      button.disabled = false;
      button.textContent = 'Excluir';
    } finally { pendingDeletion = null; }
  });
  deleteDialog.addEventListener('close', () => { pendingDeletion = null; });
  new MutationObserver(() => {
    if (updateScheduled) return;
    updateScheduled = true;
    requestAnimationFrame(() => {
      updateScheduled = false;
      addDeleteButtons();
    });
  }).observe(document.querySelector('#routes-grid'), { childList: true });
  addDeleteButtons();
})();
