import { configureSession } from '../api/apiClient.js';

const AUTHENTICATED_SESSION_KEY = 'radar-passagens:authenticated';

export function createAuthenticationFeature({ elements, authApi, onAuthenticated }) {
  let activeVerification;
  let resetToken;
  let recoveryPhone;

  function setAuthenticatedSession(isAuthenticated) {
    document.documentElement.toggleAttribute('data-authenticated', isAuthenticated);
    try {
      if (isAuthenticated) {
        window.localStorage.setItem(AUTHENTICATED_SESSION_KEY, 'true');
      } else {
        window.localStorage.removeItem(AUTHENTICATED_SESSION_KEY);
      }
    } catch {
      // The session remains valid when storage is unavailable.
    }
  }

  function showMessage(message, type = '') {
    elements.message.textContent = message;
    elements.message.className = `auth-message ${type}`;
  }

  function showPanel(panel) {
    const isLogin = panel === 'login';
    const isRegister = panel === 'register';
    elements.loginForm.hidden = !isLogin;
    elements.registerForm.hidden = !isRegister;
    elements.recoveryForm.hidden = panel !== 'recovery';
    elements.resetPinForm.hidden = panel !== 'reset-pin';
    elements.tabs.hidden = !isLogin && !isRegister;
    elements.loginTab.classList.toggle('active', isLogin);
    elements.registerTab.classList.toggle('active', isRegister);
    elements.telegramStep.hidden = true;
    activeVerification = undefined;
    resetToken = undefined;
    recoveryPhone = undefined;
    showMessage('');
  }

  function showConfirmation(verification, purpose, phone) {
    elements.loginForm.hidden = true;
    elements.registerForm.hidden = true;
    elements.recoveryForm.hidden = true;
    elements.resetPinForm.hidden = true;
    elements.tabs.hidden = true;
    elements.telegramLink.href = verification.urlTelegram;
    elements.telegramStep.hidden = false;
    elements.verificationForm.reset();
    elements.verificationSubmit.textContent = 'Confirmar código';
    elements.verificationSubmit.disabled = true;
    activeVerification = { id: verification.id, purpose, phone };
    showMessage('');
    elements.verificationCode.focus();
  }

  function showResetPin(token, phone) {
    elements.loginForm.hidden = true;
    elements.registerForm.hidden = true;
    elements.recoveryForm.hidden = true;
    elements.telegramStep.hidden = true;
    elements.tabs.hidden = true;
    elements.resetPinForm.hidden = false;
    elements.resetPinForm.reset();
    setLoading(
      elements.resetPinForm.querySelector('button[type="submit"]'),
      false,
      'Salvar novo PIN',
    );
    activeVerification = undefined;
    resetToken = token;
    recoveryPhone = phone;
    showMessage('Código confirmado. Crie seu novo PIN.', 'success');
    elements.resetPinForm.elements.pin.focus();
  }

  function showAuthentication() {
    setAuthenticatedSession(false);
    elements.appShell.hidden = true;
    elements.screen.hidden = false;
    showPanel('login');
  }

  function showApplication() {
    setAuthenticatedSession(true);
    elements.screen.hidden = true;
    elements.appShell.hidden = false;
    onAuthenticated();
  }

  function setLoading(button, loading, label) {
    button.disabled = loading;
    button.textContent = loading ? 'Aguarde…' : label;
  }

  function validatePin(pin) {
    return /^\d{4}$/.test(pin);
  }

  function validateVerificationCode(code) {
    return /^\d{6}$/.test(code);
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
    [elements.loginForm, elements.registerForm, elements.recoveryForm].forEach((form) => {
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

  function showVerificationError(error) {
    const message = error instanceof Error ? error.message : 'Não foi possível confirmar o código.';
    if (/código de verificação inválido ou expirado/i.test(message)) {
      showMessage(
        `${message} Confira o código; se ele expirou ou as tentativas foram excedidas, inicie novamente.`,
        'error',
      );
      return;
    }
    showMessage(message, 'error');
  }

  async function continueRecovery() {
    const verification = await authApi.verificationStatus(activeVerification.id);
    if (verification.status !== 'VERIFICADA') {
      throw new Error('A verificação ainda não está disponível para redefinir o PIN.');
    }
    if (!verification.tokenRedefinicao) {
      throw new Error('A API não retornou o token necessário para redefinir o PIN.');
    }
    showResetPin(verification.tokenRedefinicao, activeVerification.phone);
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
      showConfirmation(verification, 'registration', phone);
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setLoading(button, false, 'Continuar');
    }
  }

  async function handleRecovery(event) {
    event.preventDefault();
    const { telefone } = Object.fromEntries(new FormData(elements.recoveryForm));
    const phone = normalizePhone(telefone);
    if (!validatePhone(phone)) {
      showMessage('Informe um telefone no formato +5561999999999.', 'error');
      return;
    }

    const button = elements.recoveryForm.querySelector('button[type="submit"]');
    setLoading(button, true, 'Continuar');
    try {
      const verification = await authApi.startRecovery(phone);
      showConfirmation(verification, 'recovery', phone);
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setLoading(button, false, 'Continuar');
    }
  }

  async function handleVerificationConfirmation(event) {
    event.preventDefault();
    const code = elements.verificationCode.value;
    if (!activeVerification || !validateVerificationCode(code)) return;

    const wasConfirmed = activeVerification.codeConfirmed;
    setLoading(
      elements.verificationSubmit,
      true,
      wasConfirmed ? 'Tentar novamente' : 'Confirmar código',
    );
    try {
      if (wasConfirmed) {
        await continueRecovery();
        return;
      }

      await authApi.confirmVerification(activeVerification.id, code);
      if (activeVerification.purpose === 'registration') {
        const { phone } = activeVerification;
        showPanel('login');
        elements.loginForm.elements.telefone.value = formatPhone(phone.replace(/^\+55/, ''));
        showMessage('Telefone confirmado. Entre com seu PIN para acessar suas rotas.', 'success');
        return;
      }

      activeVerification.codeConfirmed = true;
      await continueRecovery();
    } catch (error) {
      if (activeVerification?.purpose === 'recovery' && activeVerification.codeConfirmed) {
        showMessage(
          `Código confirmado, mas não foi possível preparar a redefinição do PIN. ${error.message} Tente novamente.`,
          'error',
        );
        return;
      }
      showVerificationError(error);
    } finally {
      if (activeVerification) {
        setLoading(
          elements.verificationSubmit,
          false,
          activeVerification.codeConfirmed ? 'Tentar novamente' : 'Confirmar código',
        );
      }
    }
  }

  async function handleResetPin(event) {
    event.preventDefault();
    if (!resetToken) {
      showMessage('Inicie a recuperação novamente para criar um novo PIN.', 'error');
      return;
    }

    const { pin, confirmacaoPin } = Object.fromEntries(new FormData(elements.resetPinForm));
    if (!validatePin(pin)) {
      showMessage('Crie um PIN de quatro números.', 'error');
      return;
    }
    if (pin !== confirmacaoPin) {
      showMessage('Os PINs informados não são iguais.', 'error');
      return;
    }

    const button = elements.resetPinForm.querySelector('button[type="submit"]');
    setLoading(button, true, 'Salvar novo PIN');
    try {
      await authApi.resetPin(resetToken, pin);
      const phone = recoveryPhone;
      showPanel('login');
      if (phone)
        elements.loginForm.elements.telefone.value = formatPhone(phone.replace(/^\+55/, ''));
      showMessage('PIN redefinido. Entre para acessar suas rotas.', 'success');
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setLoading(button, false, 'Salvar novo PIN');
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
    elements.forgotPinButton.addEventListener('click', () => showPanel('recovery'));
    elements.recoveryBackButton.addEventListener('click', () => showPanel('login'));
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.registerForm.addEventListener('submit', handleRegistration);
    elements.recoveryForm.addEventListener('submit', handleRecovery);
    elements.verificationForm.addEventListener('submit', handleVerificationConfirmation);
    elements.resetPinForm.addEventListener('submit', handleResetPin);
    elements.verificationCode.addEventListener('input', () => {
      elements.verificationSubmit.disabled = !validateVerificationCode(
        elements.verificationCode.value,
      );
    });
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
