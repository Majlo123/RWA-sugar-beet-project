import { test, expect } from '@playwright/test';
import { uniqueUsername, randomEthAddress, isJwt } from '../utils/helpers';

test.describe('POST /auth/register', () => {
  test('happy path: 201 with user payload (no password)', async ({ request }) => {
    const username = uniqueUsername('reg_happy');
    const res = await request.post('/auth/register', {
      data: { username, password: 'lozinka123', ethAddress: randomEthAddress() },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.message).toBe('User registered successfully.');
    expect(typeof body.user.id).toBe('number');
    expect(body.user.username).toBe(username);
    expect(body.user.ethAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(body.user.password).toBeUndefined();
  });

  test('400 when fields are missing (empty body)', async ({ request }) => {
    const res = await request.post('/auth/register', { data: {} });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('All fields are required.');
  });

  test('400 when username already exists', async ({ request }) => {
    const username = uniqueUsername('reg_dup');
    const payload = { username, password: 'lozinka123', ethAddress: randomEthAddress() };

    const first = await request.post('/auth/register', { data: payload });
    expect(first.status()).toBe(201);

    const second = await request.post('/auth/register', {
      data: { ...payload, ethAddress: randomEthAddress() },
    });
    expect(second.status()).toBe(400);
    expect((await second.json()).message).toBe('Username is already taken.');
  });
});

test.describe('POST /auth/login', () => {
  test('happy path: 200 with JWT token', async ({ request }) => {
    const username = uniqueUsername('login_happy');
    const password = 'lozinka123';
    await request.post('/auth/register', {
      data: { username, password, ethAddress: randomEthAddress() },
    });

    const res = await request.post('/auth/login', { data: { username, password } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(isJwt(body.token)).toBe(true);
  });

  test('400 when fields are missing', async ({ request }) => {
    const res = await request.post('/auth/login', { data: {} });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Username and password are required.');
  });

  test('400 with wrong password', async ({ request }) => {
    const username = uniqueUsername('login_wrongpw');
    await request.post('/auth/register', {
      data: { username, password: 'pravalozinka', ethAddress: randomEthAddress() },
    });

    const res = await request.post('/auth/login', {
      data: { username, password: 'pogresnalozinka' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Incorrect password.');
  });

  test('400 with non-existing username', async ({ request }) => {
    const res = await request.post('/auth/login', {
      data: { username: uniqueUsername('nonexistent'), password: 'whatever' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('User not found.');
  });
});
