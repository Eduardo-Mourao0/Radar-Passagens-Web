import { configureSession } from '../api/apiClient.js';

const POLLING_INTERVAL = 3000;

export function createAuthenticationFeature({ elements, authApi, onAuthenticated }) {
  let verificationPolling;
  let verificationTimeout;

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
    if (verificationTimeout) window.clearTimeout(verificationTimeout);
    verificationPolling = undefined;
    verificationTimeout = undefined;
  }

  function setLoading(button, loading, label) {
    button.disabled = loading;
    button.textContent = loading ? 'Aguarde…' : label;
  }

  function validatePin(pin) {
    return /^\d{4}$/.test(pin);
  }

  function validatePhone(phone) {
    return /^\+55\d{10,11}$/.test(phone);
  }

  function getNationalPhoneDigits(phone) {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length > 11) {
      digits = digits.slice(2);
    }
    return digits.slice(0, 11);
  }

  function normalizePhone(phone) {
    return `+55${getNationalPhoneDigits(phone)}`;
  }

  function formatPhone(phone) {
    const digits = getNationalPhoneDigits(phone);
    if (digits.length <= 2) return digits ? `(${digits}` : '';

    const areaCode = digits.slice(0, 2);
    const subscriberNumber = digits.slice(2);
    if (subscriberNumber.length <= 4) return `(${areaCode}) ${subscriberNumber}`;

    const firstPartLength = digits.length > 10 ? 5 : 4;
    const firstPart = subscriberNumber.slice(0, firstPartLength);
    const secondPart = subscriberNumber.slice(firstPartLength);
    return secondPart ? `(${areaCode}) ${firstPart}-${secondPart}` : `(${areaCode}) ${firstPart}`;
  }

  function setupPhoneInputs() {
    [elements.loginForm, elements.registerForm].forEach((form) => {
      const input = form.elements.telefone;
      if (!(input instanceof HTMLInputElement)) return;
      input.addEventListener('input', () => {
        input.value = formatPhone(input.value);
      });
    });
  }

  function setupPinToggles() {
    document.querySelectorAll('[data-pin-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const input = document.querySelector(`#${button.dataset.pinToggle}`);
        if (!(input instanceof HTMLInputElement)) return;
        const isVisible = input.type === 'text';
        input.type = isVisible ? 'password' : 'text';
        button.classList.toggle('is-visible', !isVisible);
        button.setAttribute('aria-label', isVisible ? 'Mostrar PIN' : 'Ocultar PIN');
        button.setAttribute('aria-pressed', String(!isVisible));
        button.title = isVisible ? 'Mostrar PIN' : 'Ocultar PIN';
      });
    });
  }

  async function checkVerification(id, phone) {
    try {
      const verification = await authApi.verificationStatus(id);
      if (verification.status === 'PENDENTE') return true;

      clearVerificationPolling();
      if (verification.status === 'VERIFICADA') {
        showPanel('login');
        elements.loginForm.elements.telefone.value = formatPhone(phone.replace(/^\+55/, ''));
        showMessage('Telefone confirmado. Entre com seu PIN para acessar suas rotas.', 'success');
        return false;
      }

      elements.telegramStep.hidden = true;
      showMessage('O prazo de confirmação expirou. Inicie o cadastro novamente.', 'error');
      return false;
    } catch (error) {
      clearVerificationPolling();
      elements.telegramStep.hidden = true;
      showMessage(error.message, 'error');
      return false;
    }
  }

  function expireVerification() {
    clearVerificationPolling();
    elements.telegramStep.hidden = true;
    showMessage('O prazo de confirmação expirou. Inicie o cadastro novamente.', 'error');
  }

  function startVerificationPolling(id, phone, expiresAt) {
    const remainingTime = new Date(expiresAt).getTime() - Date.now();
    if (!Number.isFinite(remainingTime) || remainingTime <= 0) {
      expireVerification();
      return;
    }

    let checking = false;
    verificationPolling = window.setInterval(async () => {
      if (checking) return;
      checking = true;
      const isPending = await checkVerification(id, phone);
      checking = false;
      if (!isPending) clearVerificationPolling();
    }, POLLING_INTERVAL);
    verificationTimeout = window.setTimeout(expireVerification, remainingTime);
  }

  async function handleLogin(event) {
    event.preventDefault();
    const { telefone, pin } = Object.fromEntries(new FormData(elements.loginForm));
    const phone = normalizePhone(telefone);
    if (!validatePhone(phone)) {
      showMessage('Informe um telefone no formato +5561999999999.', 'error');
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
    const phone = normalizePhone(telefone);
    if (!validatePhone(phone)) {
      showMessage('Informe um telefone no formato +5561999999999.', 'error');
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
      const isPending = await checkVerification(verification.id, phone);
      if (isPending) startVerificationPolling(verification.id, phone, verification.expiraEm);
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
    setupPhoneInputs();
    setupPinToggles();
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
