// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEMO_PASSWORD } from '../demoAccounts';
import { signToken } from './crypto';
import { STORAGE_KEY } from './server';
import { call, login, makeServer } from './testHelpers';

const valid = { name: 'Zed Test', email: 'Zed@Example.com', password: 'longenough' };

describe('POST /auth/register', () => {
  it('creates a user and returns a token (201)', async () => {
    const { server } = makeServer();
    const res = await call(server, 'POST', '/auth/register', { body: valid });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Zed Test', email: 'zed@example.com' });
    expect(res.body.user.avatarColor).toMatch(/^#[0-9a-f]{6}$/);
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user).not.toHaveProperty('salt');
    expect(res.body.token.split('.')).toHaveLength(3);
    const me = await call(server, 'GET', '/auth/me', { token: res.body.token });
    expect(me.body.user.id).toBe(res.body.user.id);
  });

  it('trims the name', async () => {
    const { server } = makeServer();
    const res = await call(server, 'POST', '/auth/register', {
      body: { ...valid, name: '  Zed  ' },
    });
    expect(res.body.user.name).toBe('Zed');
  });

  it.each([
    ['missing name', { ...valid, name: '  ' }, 'name'],
    ['name too long', { ...valid, name: 'x'.repeat(61) }, 'name'],
    ['missing email', { ...valid, email: undefined }, 'email'],
    ['email without @', { ...valid, email: 'nope' }, 'email'],
    ['email without dot in domain', { ...valid, email: 'a@b' }, 'email'],
    ['email with space', { ...valid, email: 'a b@c.de' }, 'email'],
    ['email too long', { ...valid, email: `${'a'.repeat(250)}@b.co` }, 'email'],
    ['short password', { ...valid, password: 'short' }, 'password'],
    ['missing password', { ...valid, password: undefined }, 'password'],
  ])('400 for %s', async (_label, body, field) => {
    const { server } = makeServer();
    const res = await call(server, 'POST', '/auth/register', { body });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
    expect(res.body.error.fields[field]).toEqual(expect.any(String));
  });

  it('400 when the body is missing or not an object', async () => {
    const { server } = makeServer();
    expect((await call(server, 'POST', '/auth/register')).status).toBe(400);
    expect((await call(server, 'POST', '/auth/register', { body: [] })).status).toBe(400);
    expect((await call(server, 'POST', '/auth/register', { body: 'x' })).status).toBe(400);
  });

  it('409 for a duplicate email, case-insensitively', async () => {
    const { server } = makeServer();
    const res = await call(server, 'POST', '/auth/register', {
      body: { ...valid, email: 'ANA@crewboard.demo' },
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('conflict');
    expect(res.body.error.message).toBe('An account with this email already exists.');
  });

  it('never stores the plain-text password', async () => {
    const { server, storage } = makeServer();
    await call(server, 'POST', '/auth/register', { body: valid });
    const raw = storage.getItem(STORAGE_KEY)!;
    expect(raw).not.toContain('longenough');
    expect(raw).not.toContain(DEMO_PASSWORD);
    const db = JSON.parse(raw);
    const stored = db.users.find((u: { email: string }) => u.email === 'zed@example.com');
    expect(stored.passwordHash).toEqual(expect.any(String));
    expect(stored.salt).toEqual(expect.any(String));
  });

  it('uses a different salt per user', async () => {
    const { server, storage } = makeServer();
    await call(server, 'GET', '/auth/me');
    const db = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(new Set(db.users.map((u: { salt: string }) => u.salt)).size).toBe(db.users.length);
    expect(new Set(db.users.map((u: { passwordHash: string }) => u.passwordHash)).size).toBe(
      db.users.length,
    );
  });
});

describe('POST /auth/login', () => {
  it('200 with token and user', async () => {
    const { server } = makeServer();
    const res = await call(server, 'POST', '/auth/login', {
      body: { email: ' ANA@crewboard.demo ', password: DEMO_PASSWORD },
    });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('u-ana');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('wrong password and unknown email give the same 401', async () => {
    const { server } = makeServer();
    const wrong = await call(server, 'POST', '/auth/login', {
      body: { email: 'ana@crewboard.demo', password: 'wrongpass1' },
    });
    const unknown = await call(server, 'POST', '/auth/login', {
      body: { email: 'nobody@crewboard.demo', password: 'wrongpass1' },
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.error.code).toBe('invalid_credentials');
    expect(wrong.body.error.message).toBe('Incorrect email or password.');
  });

  it('400 for missing fields', async () => {
    const { server } = makeServer();
    const res = await call(server, 'POST', '/auth/login', { body: {} });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('email');
    expect(res.body.error.fields).toHaveProperty('password');
    expect((await call(server, 'POST', '/auth/login')).status).toBe(400);
  });
});

describe('GET /auth/me and token checks', () => {
  it('200 with a valid token', async () => {
    const { server } = makeServer();
    const { token } = await login(server);
    const res = await call(server, 'GET', '/auth/me', { token });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ana@crewboard.demo');
  });

  it('token has JWT shape with sub/iat/exp in seconds', async () => {
    const { server } = makeServer({ now: () => 1_700_000_000_000, tokenTtlMs: 60_000 });
    const { token } = await login(server);
    const [h, p] = token.split('.');
    const dec = (s: string) => JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')));
    expect(dec(h!)).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(dec(p!)).toEqual({ sub: 'u-ana', iat: 1_700_000_000, exp: 1_700_000_060 });
  });

  it('401 without an Authorization header', async () => {
    const { server } = makeServer();
    const res = await call(server, 'GET', '/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it.each([
    ['not a bearer header', { Authorization: 'Basic abc' }],
    ['bearer without token', { Authorization: 'Bearer' }],
    ['malformed token', { Authorization: 'Bearer not-a-token' }],
    ['garbage segments', { Authorization: 'Bearer a.b.c' }],
  ])('401 for %s', async (_l, headers) => {
    const { server } = makeServer();
    const res = await call(server, 'GET', '/auth/me', { headers });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('accepts a lower-case header name', async () => {
    const { server } = makeServer();
    const { token } = await login(server);
    const res = await call(server, 'GET', '/auth/me', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
  });

  it('401 for a bad signature', async () => {
    const { server } = makeServer();
    const { token } = await login(server);
    const [h, p, s] = token.split('.');
    const tampered = `${h}.${p}.${s!.slice(0, -2)}${s!.endsWith('AA') ? 'BB' : 'AA'}`;
    expect((await call(server, 'GET', '/auth/me', { token: tampered })).status).toBe(401);
    const forged = await signToken({ sub: 'u-ana', iat: 0, exp: 9_999_999_999 }, 'other-secret');
    expect((await call(server, 'GET', '/auth/me', { token: forged })).status).toBe(401);
  });

  it('401 for a tampered payload', async () => {
    const { server } = makeServer();
    const { token } = await login(server);
    const [h, , s] = token.split('.');
    const payload = btoa(JSON.stringify({ sub: 'u-ben', iat: 0, exp: 9_999_999_999 }))
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    expect((await call(server, 'GET', '/auth/me', { token: `${h}.${payload}.${s}` })).status).toBe(
      401,
    );
  });

  it('401 once the token has expired', async () => {
    let t = 1_700_000_000_000;
    const { server } = makeServer({ now: () => t });
    const { token } = await login(server);
    t += 12 * 60 * 60 * 1000 - 1000;
    expect((await call(server, 'GET', '/auth/me', { token })).status).toBe(200);
    t += 1000;
    const res = await call(server, 'GET', '/auth/me', { token });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('401 when the user no longer exists (after demo reset)', async () => {
    const { server } = makeServer();
    const reg = await call(server, 'POST', '/auth/register', { body: valid });
    const { token: demoToken } = await login(server);
    await call(server, 'POST', '/demo/reset', { token: demoToken });
    expect((await call(server, 'GET', '/auth/me', { token: reg.body.token })).status).toBe(401);
    expect((await call(server, 'GET', '/auth/me', { token: demoToken })).status).toBe(200);
  });
});
