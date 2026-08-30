import assert from 'node:assert/strict';
import test from 'node:test';
import { authApi } from '../src/js/api/authApi.js';

const verificationId = 'c9e0e8f7-39ef-4279-87a8-2867f5db95eb';

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
});

test('conclui a confirmação quando a API responde sem conteúdo', async () => {
  globalThis.fetch = async () => response(204);

  await assert.doesNotReject(authApi.confirmVerification(verificationId, '123456'));
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
