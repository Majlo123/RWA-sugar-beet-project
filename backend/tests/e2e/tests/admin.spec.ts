import { test, expect } from '@playwright/test';
import { adminCredentials, getAdminToken, getRegularUserToken } from '../utils/auth';

test.describe('GET /admin/analytics', () => {
  test('401 when no token provided', async ({ request }) => {
    const res = await request.get('/admin/analytics');
    expect(res.status()).toBe(401);
    expect((await res.json()).message).toBe(
      'Authorization failed: Token not provided.',
    );
  });

  test('403 when token belongs to a non-admin user', async ({ request }) => {
    const token = await getRegularUserToken(request, 'analytics_nonadmin');
    const res = await request.get('/admin/analytics', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).message).toBe(
      'Access denied: Admin privileges required.',
    );
  });

  test('403 when token is malformed', async ({ request }) => {
    const res = await request.get('/admin/analytics', {
      headers: { Authorization: 'Bearer garbage.token.here' },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).message).toBe(
      'Authorization failed: Token is not valid.',
    );
  });

  test('200 with admin token: returns summary, investments, users', async ({ request }) => {
    test.skip(
      !adminCredentials(),
      'Set ADMIN_USERNAME and ADMIN_PASSWORD env vars to run admin happy path.',
    );

    const token = await getAdminToken(request);
    const res = await request.get('/admin/analytics', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();

    expect(body.summary).toBeDefined();
    expect(typeof body.summary.totalUsers).toBe('number');
    expect(typeof body.summary.totalInvestments).toBe('number');
    expect(typeof body.summary.uniqueInvestors).toBe('number');
    expect(typeof body.summary.totalUSDInvested).toBe('number');
    expect(typeof body.summary.totalBEETMinted).toBe('number');
    expect(typeof body.summary.claimedCount).toBe('number');
    expect(typeof body.summary.maturedUnclaimedCount).toBe('number');
    expect(typeof body.summary.pendingCount).toBe('number');

    expect(Array.isArray(body.investments)).toBe(true);
    expect(Array.isArray(body.users)).toBe(true);
    expect(body.investments.length).toBe(body.summary.totalInvestments);
    expect(body.users.length).toBe(body.summary.totalUsers);

    if (body.investments.length > 0) {
      const inv = body.investments[0];
      expect(typeof inv.id).toBe('string');
      expect(typeof inv.username).toBe('string');
      expect(typeof inv.ethAddress).toBe('string');
      expect(typeof inv.amountUSD).toBe('number');
      expect(typeof inv.startTime).toBe('number');
      expect(typeof inv.maturesOn).toBe('number');
      expect(typeof inv.isClaimed).toBe('boolean');
      expect(typeof inv.isMatured).toBe('boolean');
    }

    if (body.users.length > 0) {
      const u = body.users[0];
      expect(typeof u.id).toBe('number');
      expect(typeof u.username).toBe('string');
      expect(typeof u.ethAddress).toBe('string');
      expect(typeof u.role).toBe('string');
      expect(typeof u.createdAt).toBe('string');
      expect(typeof u.investmentCount).toBe('number');
      expect(typeof u.totalInvested).toBe('number');
    }

    const totalFromInvestments = body.investments.reduce(
      (s: number, i: { amountUSD: number }) => s + i.amountUSD,
      0,
    );
    expect(totalFromInvestments).toBe(body.summary.totalUSDInvested);
  });
});
