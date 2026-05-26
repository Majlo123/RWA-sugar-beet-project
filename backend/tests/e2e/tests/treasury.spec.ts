import { test, expect } from '@playwright/test';
import { randomEthAddress } from '../utils/helpers';
import { adminCredentials, getAdminToken, getRegularUserToken } from '../utils/auth';

test.describe('GET /token-price', () => {
  test('200 returns tokenPriceUSD as string', async ({ request }) => {
    const res = await request.get('/token-price');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(typeof body.tokenPriceUSD).toBe('string');
    expect(Number.isInteger(parseInt(body.tokenPriceUSD, 10))).toBe(true);
    expect(parseInt(body.tokenPriceUSD, 10)).toBeGreaterThan(0);
  });
});

test.describe('POST /record-investment', () => {
  test('401 when no token provided', async ({ request }) => {
    const res = await request.post('/record-investment', {
      data: { investorAddress: randomEthAddress(), amountUSD: 1000 },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).message).toBe(
      'Authorization failed: Token not provided.',
    );
  });

  test('403 when token belongs to a non-admin user', async ({ request }) => {
    const token = await getRegularUserToken(request, 'invest_nonadmin');
    const res = await request.post('/record-investment', {
      headers: { Authorization: `Bearer ${token}` },
      data: { investorAddress: randomEthAddress(), amountUSD: 1000 },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).message).toBe(
      'Access denied: Admin privileges required.',
    );
  });

  test('400 when fields are missing (admin token, empty body)', async ({ request }) => {
    test.skip(
      !adminCredentials(),
      'Set ADMIN_USERNAME and ADMIN_PASSWORD env vars to run admin-gated tests.',
    );
    const token = await getAdminToken(request);
    const res = await request.post('/record-investment', {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe(
      'Investor address and amount are required.',
    );
  });

  test('500 when amountUSD is not a multiple of 1000 (admin token)', async ({ request }) => {
    test.skip(
      !adminCredentials(),
      'Set ADMIN_USERNAME and ADMIN_PASSWORD env vars to run admin-gated tests.',
    );
    const token = await getAdminToken(request);
    const res = await request.post('/record-investment', {
      headers: { Authorization: `Bearer ${token}` },
      data: { investorAddress: randomEthAddress(), amountUSD: 1500 },
    });
    expect(res.status()).toBe(500);
    expect((await res.json()).error).toBe('A server error occurred.');
  });

  test.skip('happy path: 200 with txHash', async () => {
    // Skip: requires real Sepolia ETH on the admin wallet, registered investor in
    // the contract, and waits for on-chain confirmation (slow & non-deterministic).
    // Re-enable manually when running against a funded admin wallet.
  });
});
