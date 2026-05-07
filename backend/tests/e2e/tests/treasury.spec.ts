import { test, expect } from '@playwright/test';
import { randomEthAddress } from '../utils/helpers';

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
  test('400 when fields are missing (empty body)', async ({ request }) => {
    const res = await request.post('/record-investment', { data: {} });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe(
      'Potrebno je uneti adresu investitora i iznos.',
    );
  });

  test('400 when only investorAddress provided', async ({ request }) => {
    const res = await request.post('/record-investment', {
      data: { investorAddress: randomEthAddress() },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe(
      'Potrebno je uneti adresu investitora i iznos.',
    );
  });

  test('500 when amountUSD is not a multiple of 1000', async ({ request }) => {
    const res = await request.post('/record-investment', {
      data: { investorAddress: randomEthAddress(), amountUSD: 1500 },
    });
    expect(res.status()).toBe(500);
    expect((await res.json()).error).toBe('Došlo je do greške na serveru.');
  });

  test.skip('happy path: 200 with txHash', async () => {
    // Skip: requires real Sepolia ETH on the admin wallet, registered investor in
    // the contract, and waits for on-chain confirmation (slow & non-deterministic).
    // Re-enable manually when running against a funded admin wallet.
  });
});
