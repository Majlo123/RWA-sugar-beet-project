import { test, expect } from '@playwright/test';
import { uniqueUsername, randomEthAddress } from '../utils/helpers';

test.describe('GET /users/profile', () => {
  test('401 when no Authorization header', async ({ request }) => {
    const res = await request.get('/users/profile');
    expect(res.status()).toBe(401);
    expect((await res.json()).message).toBe(
      'Authorization failed: Token not provided.',
    );
  });

  test('401 when header is not Bearer format', async ({ request }) => {
    const res = await request.get('/users/profile', {
      headers: { Authorization: 'NotBearer somerandomtoken' },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).message).toBe(
      'Authorization failed: Token not provided.',
    );
  });

  test('403 with invalid/garbage token', async ({ request }) => {
    const res = await request.get('/users/profile', {
      headers: { Authorization: 'Bearer garbage.token.here' },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).message).toBe(
      'Authorization failed: Token is not valid.',
    );
  });

  test('200 with valid token returns user without password', async ({ request }) => {
    const username = uniqueUsername('profile');
    const password = 'lozinka123';
    const ethAddress = randomEthAddress();

    await request.post('/auth/register', { data: { username, password, ethAddress } });
    const loginRes = await request.post('/auth/login', { data: { username, password } });
    const { token } = await loginRes.json();

    const res = await request.get('/users/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.username).toBe(username);
    expect(body.ethAddress).toBe(ethAddress);
    expect(body.role).toBe('user');
    expect(typeof body.id).toBe('number');
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
    expect(body.password).toBeUndefined();
  });
});
