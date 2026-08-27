import { describe, it, expect } from 'vitest';
import { signSession, verifySession, type SessionPayload } from '../jwt';

const payload: SessionPayload = {
  userId: 'u1',
  organizationId: 'org1',
  role: 'MASTER',
};

describe('jwt', () => {
  it('token assinado e verificado devolve o mesmo payload', async () => {
    const token = await signSession(payload);
    expect(await verifySession(token)).toMatchObject(payload);
  });

  it('preserva simulatedBy quando presente', async () => {
    const token = await signSession({ ...payload, simulatedBy: 'master-1' });
    expect(await verifySession(token)).toMatchObject({ simulatedBy: 'master-1' });
  });

  it('token adulterado e rejeitado', async () => {
    const token = await signSession(payload);
    expect(await verifySession(token.slice(0, -3) + 'aaa')).toBeNull();
  });

  it('token assinado com outro segredo e rejeitado', async () => {
    const token = await signSession(payload);
    const original = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = 'outro-segredo-com-mais-de-32-caracteres!!';
    const result = await verifySession(token);
    process.env.AUTH_SECRET = original;
    expect(result).toBeNull();
  });

  it('token expirado e rejeitado', async () => {
    const token = await signSession(payload, -10);
    expect(await verifySession(token)).toBeNull();
  });

  it('lixo nao e aceito como token', async () => {
    expect(await verifySession('nao-e-um-jwt')).toBeNull();
    expect(await verifySession('')).toBeNull();
  });

  it('falha explicitamente quando AUTH_SECRET e fraca', async () => {
    const original = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = 'curta';
    await expect(signSession(payload)).rejects.toThrow(/AUTH_SECRET/);
    process.env.AUTH_SECRET = original;
  });
});
