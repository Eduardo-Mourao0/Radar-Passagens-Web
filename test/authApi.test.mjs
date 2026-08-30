import assert from 'node:assert/strict';
import test from 'node:test';
import { authApi } from '../src/js/api/authApi.js';

const verificationId = 'c9e0e8f7-39ef-4279-87a8-2867f5db95eb';
const verificationResponse = {
  id: verificationId,
  expiraEm: '2026-08-30T22:00:00.000Z',
  urlTelegram: 'https://t.me/radarpassagensbot?start=token',
};

function response(status, body = '') {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => body,
  };
}

test('envia o código de seis dígitos para confirmar a verificação', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return response(204);
  };

  await authApi.confirmVerification(verificationId, '123456');

  assert.equal(request.url, `/api/auth/verificacoes/${verificationId}/confirmar`);
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(JSON.parse(request.options.body), { codigo: '123456' });
  assert.equal(request.options.headers['Content-Type'], 'application/json');
  assert.equal(request.options.headers.Authorization, undefined);
});

test('conclui a confirmação quando a API responde sem conteúdo', async () => {
  globalThis.fetch = async () => response(204);

  await assert.doesNotReject(authApi.confirmVerification(verificationId, '123456'));
});

test('inicia a recuperação com o telefone informado', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return response(202, JSON.stringify(verificationResponse));
  };

  const verification = await authApi.startRecovery('+5561999999999');

  assert.equal(request.url, '/api/auth/recuperacoes');
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(JSON.parse(request.options.body), { telefone: '+5561999999999' });
  assert.equal(verification.id, verificationId);
});

test('expõe o erro retornado ao iniciar a recuperação', async () => {
  globalThis.fetch = async () =>
    response(404, JSON.stringify({ message: 'Telefone não encontrado.' }));

  await assert.rejects(authApi.startRecovery('+5561999999999'), /Telefone não encontrado\./);
});

test('rejeita uma resposta de recuperação com JSON inválido', async () => {
  const originalConsoleError = globalThis.console.error;
  globalThis.console.error = () => {};
  globalThis.fetch = async () => response(202, 'não é JSON');

  try {
    await assert.rejects(
      authApi.startRecovery('+5561999999999'),
      /A API retornou uma resposta inválida\./,
    );
  } finally {
    globalThis.console.error = originalConsoleError;
  }
});

test('rejeita uma resposta de recuperação sem os dados do Telegram', async () => {
  globalThis.fetch = async () => response(202, JSON.stringify({ id: verificationId }));

  await assert.rejects(
    authApi.startRecovery('+5561999999999'),
    /A API não retornou os dados necessários para confirmar no Telegram\./,
  );
});

test('envia o token e o novo PIN para redefinição', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return response(204);
  };

  await authApi.resetPin('token-redefinicao', '4321');

  assert.equal(request.url, '/api/auth/redefinir-senha');
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(JSON.parse(request.options.body), {
    tokenRedefinicao: 'token-redefinicao',
    pin: '4321',
  });
});

test('expõe o erro retornado ao redefinir o PIN', async () => {
  globalThis.fetch = async () =>
    response(401, JSON.stringify({ message: 'Token de redefinição inválido.' }));

  await assert.rejects(
    authApi.resetPin('token-inválido', '4321'),
    /Token de redefinição inválido\./,
  );
});

test('expõe o erro retornado para um código inválido ou expirado', async () => {
  globalThis.fetch = async () =>
    response(401, JSON.stringify({ message: 'Código de verificação inválido ou expirado.' }));

  await assert.rejects(
    authApi.confirmVerification(verificationId, '000000'),
    /Código de verificação inválido ou expirado\./,
  );
});

test('expõe erros de servidor ao confirmar o código', async () => {
  globalThis.fetch = async () => response(500, JSON.stringify({ message: 'Erro temporário.' }));

  await assert.rejects(authApi.confirmVerification(verificationId, '123456'), /Erro temporário\./);
});

test('expõe falhas de rede ao confirmar o código', async () => {
  globalThis.fetch = async () => {
    throw new Error('Falha de rede.');
  };

  await assert.rejects(authApi.confirmVerification(verificationId, '123456'), /Falha de rede\./);
});

test('rejeita respostas de erro com JSON inválido', async () => {
  const originalConsoleError = globalThis.console.error;
  globalThis.console.error = () => {};
  globalThis.fetch = async () => response(500, 'não é JSON');

  try {
    await assert.rejects(
      authApi.confirmVerification(verificationId, '123456'),
      /A API retornou uma resposta inválida\./,
    );
  } finally {
    globalThis.console.error = originalConsoleError;
  }
});
