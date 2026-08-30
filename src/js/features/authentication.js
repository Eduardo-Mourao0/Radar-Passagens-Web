import { configureSession } from '../api/apiClient.js';

const POLLING_INTERVAL = 3000;

export function createAuthenticationFeature({ elements, authApi, onAuthenticated }) {
  let verificationPolling;

  function showMessage(message, type = '') {
    elements.message.textContent = message;
    elements.message.className = `auth-message ${type}`;
  }

  function showPanel(panel) {
    const isLogin = panel === 'login';
    elements.loginForm.hidden = !isLogin;
    elements.registerForm.hidden = isLogin;
    elements.loginTab.classList.toggle('active', isLogin);
    elements.registerTab.classList.toggle('active', !isLogin);
    elements.telegramStep.hidden = true;
    clearVerificationPolling();
    showMessage('');
  }

  function showAuthentication() {
    elements.appShell.hidden = true;
    elements.screen.hidden = false;
    showPanel('login');
  }

  function showApplication() {
    elements.screen.hidden = true;
    elements.appShell.hidden = false;
    onAuthenticated();
  }

  function clearVerificationPolling() {
    if (verificationPolling) window.clearInterval(verificationPolling);
    verificationPolling = undefined;
  }

  function setLoading(button, loading, label) {
    button.disabled = loading;
    button.textContent = loading ? 'Aguarde…' : label;
  }

  function validatePin(pin) {
    return /^\d{4}$/.test(pin);
  }

  function validatePhone(phone) {
    return phone.length >= 8 && phone.length <= 20;
  }

  async function checkVerification(id, phone) {
    try {
      const verification = await authApi.verificationStatus(id);
      if (verification.status === 'PENDENTE') return;

      clearVerificationPolling();
      if (verification.status === 'VERIFICADA') {
        showPanel('login');
        elements.loginForm.elements.telefone.value = phone;
        showMessage('Telefone confirmado. Entre com seu PIN para acessar suas rotas.', 'success');
        return;
      }

      elements.telegramStep.hidden = true;
      showMessage('O prazo de confirmação expirou. Inicie o cadastro novamente.', 'error');
    } catch (error) {
      clearVerificationPolling();
      elements.telegramStep.hidden = true;
      showMessage(error.message, 'error');
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const { telefone, pin } = Object.fromEntries(new FormData(elements.loginForm));
    const phone = telefone.trim();
    if (!validatePhone(phone)) {
      showMessage('Informe um telefone entre 8 e 20 caracteres.', 'error');
      return;
    }
    if (!validatePin(pin)) {
      showMessage('Informe um PIN de quatro números.', 'error');
      return;
    }

    const button = elements.loginForm.querySelector('button[type="submit"]');
    setLoading(button, true, 'Entrar');
    try {
      await authApi.login(phone, pin);
      elements.loginForm.reset();
      showApplication();
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setLoading(button, false, 'Entrar');
    }
  }

  async function handleRegistration(event) {
    event.preventDefault();
    const { telefone, pin } = Object.fromEntries(new FormData(elements.registerForm));
    const phone = telefone.trim();
    if (!validatePhone(phone)) {
      showMessage('Informe um telefone entre 8 e 20 caracteres.', 'error');
      return;
    }
    if (!validatePin(pin)) {
      showMessage('Crie um PIN de quatro números.', 'error');
      return;
    }

    const button = elements.registerForm.querySelector('button[type="submit"]');
    setLoading(button, true, 'Continuar');
    try {
      const verification = await authApi.startRegistration(phone, pin);
      elements.telegramLink.href = verification.urlTelegram;
      elements.telegramStep.hidden = false;
      showMessage(
        'Abra o Telegram e confirme seu número. Esta página acompanhará a confirmação.',
        'success',
      );
      await checkVerification(verification.id, phone);
      if (!elements.telegramStep.hidden) {
        verificationPolling = window.setInterval(
          () => checkVerification(verification.id, phone),
          POLLING_INTERVAL,
        );
      }
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setLoading(button, false, 'Continuar');
    }
  }

  async function handleLogout() {
    elements.logoutButton.disabled = true;
    try {
      await authApi.logout();
    } finally {
      elements.logoutButton.disabled = false;
      showAuthentication();
    }
  }

  function setup() {
    elements.loginTab.addEventListener('click', () => showPanel('login'));
    elements.registerTab.addEventListener('click', () => showPanel('register'));
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.registerForm.addEventListener('submit', handleRegistration);
    elements.logoutButton.addEventListener('click', handleLogout);
    configureSession({
      onRefresh: authApi.refresh,
      onUnauthorized: showAuthentication,
    });
  }

  async function restoreSession() {
    try {
      await authApi.refresh();
      showApplication();
      return true;
    } catch {
      showAuthentication();
      return false;
    }
  }

  return { setup, restoreSession };
}
