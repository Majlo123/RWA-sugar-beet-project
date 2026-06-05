import { test, expect } from '@playwright/test';

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
