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
