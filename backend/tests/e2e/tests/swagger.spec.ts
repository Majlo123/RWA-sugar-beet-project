import { test, expect } from '@playwright/test';

test.describe('Swagger / OpenAPI documentation', () => {
  test('GET /api-docs renders Swagger UI in the browser', async ({ page }) => {
    await page.goto('/api-docs');

    await expect(page).toHaveTitle(/Sugar Beet Token API/i);

    const apiTitle = page.locator('.info .title, h2.title');
    await expect(apiTitle.first()).toContainText('Sugar Beet Token API');

    for (const tag of ['Auth', 'Treasury', 'Users', 'Admin']) {
      await expect(page.getByRole('heading', { name: new RegExp(tag, 'i') })).toBeVisible();
    }

    const expectedPaths = [
      '/auth/register',
      '/auth/login',
      '/users/profile',
      '/token-price',
      '/record-investment',
      '/admin/analytics',
    ];
    const dom = await page.content();
    for (const p of expectedPaths) {
      expect(dom).toContain(p);
    }
  });

  test('GET /api-docs/swagger.json returns valid OpenAPI 3.0 spec', async ({ request }) => {
    const res = await request.get('/api-docs/swagger.json');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.openapi).toBe('3.0.0');
    expect(body.info.title).toBe('Sugar Beet Token API');
    expect(body.paths).toHaveProperty('/auth/register');
    expect(body.paths).toHaveProperty('/auth/login');
    expect(body.paths).toHaveProperty('/users/profile');
    expect(body.paths).toHaveProperty('/token-price');
    expect(body.paths).toHaveProperty('/record-investment');
    expect(body.paths).toHaveProperty('/admin/analytics');
  });
});
