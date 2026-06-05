import { test, expect } from '@playwright/test';
import { getRegularUserToken } from '../utils/auth';

const NONEXISTENT_PAYMENT_ID = 999999999;

test.describe('POST /payments/initiate', () => {
  test('401 when no Authorization header', async ({ request }) => {
    const res = await request.post('/payments/initiate', {
      data: { amountUSD: 1000, paymentMethod: 'BANK' },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).message).toBe(
      'Authorization failed: Token not provided.',
    );
  });

  test('403 with garbage token', async ({ request }) => {
    const res = await request.post('/payments/initiate', {
      headers: { Authorization: 'Bearer garbage.token.here' },
      data: { amountUSD: 1000, paymentMethod: 'BANK' },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).message).toBe(
      'Authorization failed: Token is not valid.',
    );
  });

  test('400 when body is empty (logged-in user)', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pay_init_empty');
    const res = await request.post('/payments/initiate', {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe(
      'Amount and payment method are required.',
    );
  });

  test('400 with unsupported payment method', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pay_init_badmethod');
    const res = await request.post('/payments/initiate', {
      headers: { Authorization: `Bearer ${token}` },
      data: { amountUSD: 1000, paymentMethod: 'BITCOIN_CASH' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/unsupported payment method/i);
  });

  test('400 when amount is not a positive multiple of 1000 USD', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pay_init_badamt');
    const res = await request.post('/payments/initiate', {
      headers: { Authorization: `Bearer ${token}` },
      data: { amountUSD: 1500, paymentMethod: 'BANK' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/positive multiple of 1000/i);
  });

  test('400 when KYC is not verified (fresh user)', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pay_init_nokyc');
    const res = await request.post('/payments/initiate', {
      headers: { Authorization: `Bearer ${token}` },
      data: { amountUSD: 1000, paymentMethod: 'BANK' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/kyc must be verified/i);
  });
});

test.describe('POST /payments/:id/confirm', () => {
  test('401 when no Authorization header', async ({ request }) => {
    const res = await request.post(`/payments/${NONEXISTENT_PAYMENT_ID}/confirm`);
    expect(res.status()).toBe(401);
  });

  test('400 when id is not numeric', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pay_confirm_badid');
    const res = await request.post('/payments/abc/confirm', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('Invalid payment id.');
  });

  test('400 when payment does not exist', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pay_confirm_notfound');
    const res = await request.post(`/payments/${NONEXISTENT_PAYMENT_ID}/confirm`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/payment not found/i);
  });
});

test.describe('GET /payments/:id', () => {
  test('401 when no Authorization header', async ({ request }) => {
    const res = await request.get(`/payments/${NONEXISTENT_PAYMENT_ID}`);
    expect(res.status()).toBe(401);
  });

  test('400 when id is not numeric', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pay_get_badid');
    const res = await request.get('/payments/abc', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('Invalid payment id.');
  });

  test('404 when payment does not exist', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pay_get_notfound');
    const res = await request.get(`/payments/${NONEXISTENT_PAYMENT_ID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(404);
    expect((await res.json()).error).toMatch(/payment not found/i);
  });
});

test.describe('GET /payments/:id/qr-code', () => {
  test('401 when no Authorization header', async ({ request }) => {
    const res = await request.get(`/payments/${NONEXISTENT_PAYMENT_ID}/qr-code`);
    expect(res.status()).toBe(401);
  });

  test('400 when id is not numeric', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pay_qr_badid');
    const res = await request.get('/payments/abc/qr-code', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('Invalid payment id.');
  });

  test('400 when payment does not exist', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pay_qr_notfound');
    const res = await request.get(`/payments/${NONEXISTENT_PAYMENT_ID}/qr-code`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/payment not found/i);
  });
});

test.describe('POST /payments/:id/simulate', () => {
  test('401 when no Authorization header', async ({ request }) => {
    const res = await request.post(`/payments/${NONEXISTENT_PAYMENT_ID}/simulate`, {
      data: { status: 'PAID' },
    });
    expect(res.status()).toBe(401);
  });

  test('400 when id is not numeric', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pay_sim_badid');
    const res = await request.post('/payments/abc/simulate', {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'PAID' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('Invalid payment id.');
  });

  test('400 when payment does not exist', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pay_sim_notfound');
    const res = await request.post(`/payments/${NONEXISTENT_PAYMENT_ID}/simulate`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'PAID' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/payment not found/i);
  });
});

test.describe('POST /payments/:id/submit-card', () => {
  test('401 when no Authorization header', async ({ request }) => {
    const res = await request.post(`/payments/${NONEXISTENT_PAYMENT_ID}/submit-card`, {
      data: { pan: '4111111111111111', cvv: '123', expiryDate: '12/30', cardHolder: 'X' },
    });
    expect(res.status()).toBe(401);
  });

  test('400 when id is not numeric', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pay_card_badid');
    const res = await request.post('/payments/abc/submit-card', {
      headers: { Authorization: `Bearer ${token}` },
      data: { pan: '4111111111111111', cvv: '123', expiryDate: '12/30', cardHolder: 'X' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('Invalid payment id.');
  });

  test('400 when payment does not exist', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pay_card_notfound');
    const res = await request.post(`/payments/${NONEXISTENT_PAYMENT_ID}/submit-card`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { pan: '4111111111111111', cvv: '123', expiryDate: '12/30', cardHolder: 'X' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/payment not found/i);
  });
});

test.describe('POST /payments/paypal/capture', () => {
  test('401 when no Authorization header', async ({ request }) => {
    const res = await request.post('/payments/paypal/capture', {
      data: { merchantOrderId: 'x', paypalOrderId: 'y', payerId: 'z' },
    });
    expect(res.status()).toBe(401);
  });

  test('400 when merchantOrderId or paypalOrderId is missing', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pp_capture_empty');
    const res = await request.post('/payments/paypal/capture', {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe(
      'merchantOrderId and paypalOrderId are required.',
    );
  });

  test('400 when merchantOrderId does not exist', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pp_capture_notfound');
    const res = await request.post('/payments/paypal/capture', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        merchantOrderId: 'beet-nonexistent-merchant-id-xyz',
        paypalOrderId: 'PAYPAL_FAKE',
        payerId: 'PAYER_FAKE',
      },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/payment not found/i);
  });
});

test.describe('POST /payments/paypal/cancel', () => {
  test('401 when no Authorization header', async ({ request }) => {
    const res = await request.post('/payments/paypal/cancel', {
      data: { merchantOrderId: 'x' },
    });
    expect(res.status()).toBe(401);
  });

  test('400 when merchantOrderId does not exist', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pp_cancel_notfound');
    const res = await request.post('/payments/paypal/cancel', {
      headers: { Authorization: `Bearer ${token}` },
      data: { merchantOrderId: 'beet-nonexistent-merchant-id-xyz' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/payment not found/i);
  });
});

test.describe('GET /payments/history', () => {
  test('401 when no Authorization header', async ({ request }) => {
    const res = await request.get('/payments/history');
    expect(res.status()).toBe(401);
  });

  test('200 returns empty payments array for a fresh user', async ({ request }) => {
    const token = await getRegularUserToken(request, 'pay_history_fresh');
    const res = await request.get('/payments/history', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.payments)).toBe(true);
    expect(body.payments.length).toBe(0);
  });
});
