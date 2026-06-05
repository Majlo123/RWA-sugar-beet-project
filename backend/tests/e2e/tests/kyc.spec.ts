import { test, expect } from '@playwright/test';
import { adminCredentials, getAdminToken, getRegularUserToken } from '../utils/auth';

const fakePng = (): { name: string; mimeType: string; buffer: Buffer } => ({
  name: 'doc.png',
  mimeType: 'image/png',
  // 1x1 transparent PNG (valid PNG header, smallest possible).
  buffer: Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
    'hex',
  ),
});

const validKycForm = () => ({
  document: fakePng(),
  fullName: 'Test User',
  documentType: 'id_card',
  documentNumber: 'ID-' + Date.now(),
  dateOfBirth: '1995-06-15',
  country: 'Serbia',
});

test.describe('GET /users/kyc', () => {
  test('401 when no Authorization header', async ({ request }) => {
    const res = await request.get('/users/kyc');
    expect(res.status()).toBe(401);
    expect((await res.json()).message).toBe(
      'Authorization failed: Token not provided.',
    );
  });

  test('403 with garbage token', async ({ request }) => {
    const res = await request.get('/users/kyc', {
      headers: { Authorization: 'Bearer garbage.token.here' },
    });
    expect(res.status()).toBe(403);
  });

  test('200 returns status "none" for a fresh user', async ({ request }) => {
    const token = await getRegularUserToken(request, 'kyc_get_fresh');
    const res = await request.get('/users/kyc', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('none');
    expect(body.hasDocument).toBe(false);
  });
});

test.describe('POST /users/kyc/submit', () => {
  test('401 when no Authorization header', async ({ request }) => {
    const res = await request.post('/users/kyc/submit', {
      multipart: validKycForm(),
    });
    expect(res.status()).toBe(401);
  });

  test('400 when document file is missing', async ({ request }) => {
    const token = await getRegularUserToken(request, 'kyc_submit_nofile');
    const { document, ...rest } = validKycForm();
    const res = await request.post('/users/kyc/submit', {
      headers: { Authorization: `Bearer ${token}` },
      multipart: rest,
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Document file is required.');
  });

  test('400 when fullName is empty (file present)', async ({ request }) => {
    const token = await getRegularUserToken(request, 'kyc_submit_noname');
    const res = await request.post('/users/kyc/submit', {
      headers: { Authorization: `Bearer ${token}` },
      multipart: { ...validKycForm(), fullName: '' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/full name is required/i);
  });

  test('400 with an invalid documentType', async ({ request }) => {
    const token = await getRegularUserToken(request, 'kyc_submit_badtype');
    const res = await request.post('/users/kyc/submit', {
      headers: { Authorization: `Bearer ${token}` },
      multipart: { ...validKycForm(), documentType: 'driver_license' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/document type must be/i);
  });

  test('200 happy path → status becomes "pending" and survives GET /users/kyc', async ({ request }) => {
    const token = await getRegularUserToken(request, 'kyc_submit_happy');

    const submit = await request.post('/users/kyc/submit', {
      headers: { Authorization: `Bearer ${token}` },
      multipart: validKycForm(),
    });
    expect(submit.status()).toBe(200);
    const submitBody = await submit.json();
    expect(submitBody.status).toBe('pending');
    expect(submitBody.hasDocument).toBe(true);
    expect(submitBody.fullName).toBe('Test User');
    expect(submitBody.documentType).toBe('id_card');
    expect(submitBody.country).toBe('Serbia');
    expect(submitBody.submittedAt).toBeTruthy();

    const get = await request.get('/users/kyc', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(get.status()).toBe(200);
    const getBody = await get.json();
    expect(getBody.status).toBe('pending');
    expect(getBody.hasDocument).toBe(true);
  });

  test('400 when the same user submits twice in a row', async ({ request }) => {
    const token = await getRegularUserToken(request, 'kyc_submit_twice');

    const first = await request.post('/users/kyc/submit', {
      headers: { Authorization: `Bearer ${token}` },
      multipart: validKycForm(),
    });
    expect(first.status()).toBe(200);

    const second = await request.post('/users/kyc/submit', {
      headers: { Authorization: `Bearer ${token}` },
      multipart: validKycForm(),
    });
    expect(second.status()).toBe(400);
    expect((await second.json()).message).toMatch(/already have a pending/i);
  });
});

test.describe('GET /admin/kyc', () => {
  test('401 when no Authorization header', async ({ request }) => {
    const res = await request.get('/admin/kyc');
    expect(res.status()).toBe(401);
  });

  test('403 when token belongs to a non-admin user', async ({ request }) => {
    const token = await getRegularUserToken(request, 'admin_kyc_nonadmin');
    const res = await request.get('/admin/kyc', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).message).toBe(
      'Access denied: Admin privileges required.',
    );
  });

  test('200 returns items array for admin', async ({ request }) => {
    test.skip(
      !adminCredentials(),
      'Set ADMIN_USERNAME and ADMIN_PASSWORD env vars to run admin-gated tests.',
    );
    const token = await getAdminToken(request);
    const res = await request.get('/admin/kyc', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
  });

  test('400 with invalid status filter (admin)', async ({ request }) => {
    test.skip(
      !adminCredentials(),
      'Set ADMIN_USERNAME and ADMIN_PASSWORD env vars to run admin-gated tests.',
    );
    const token = await getAdminToken(request);
    const res = await request.get('/admin/kyc?status=banana', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/invalid status filter/i);
  });
});

test.describe('POST /admin/kyc/:userId/approve', () => {
  test('401 when no Authorization header', async ({ request }) => {
    const res = await request.post('/admin/kyc/1/approve');
    expect(res.status()).toBe(401);
  });

  test('403 when token belongs to a non-admin user', async ({ request }) => {
    const token = await getRegularUserToken(request, 'admin_approve_nonadmin');
    const res = await request.post('/admin/kyc/1/approve', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });

  test('400 when userId is not numeric', async ({ request }) => {
    test.skip(
      !adminCredentials(),
      'Set ADMIN_USERNAME and ADMIN_PASSWORD env vars to run admin-gated tests.',
    );
    const token = await getAdminToken(request);
    const res = await request.post('/admin/kyc/abc/approve', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Invalid user ID.');
  });

  test('400 when user does not exist (admin)', async ({ request }) => {
    test.skip(
      !adminCredentials(),
      'Set ADMIN_USERNAME and ADMIN_PASSWORD env vars to run admin-gated tests.',
    );
    const token = await getAdminToken(request);
    const res = await request.post('/admin/kyc/999999999/approve', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('User not found.');
  });

  test('happy flow: submit KYC then admin approves → status becomes verified', async ({ request }) => {
    test.skip(
      !adminCredentials(),
      'Set ADMIN_USERNAME and ADMIN_PASSWORD env vars to run admin-gated tests.',
    );

    // Register fresh user + submit KYC
    const username = `kyc_approve_${Date.now()}`;
    const password = 'lozinka123';
    const ethAddress =
      '0x' +
      Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join('');
    const reg = await request.post('/auth/register', {
      data: { username, password, ethAddress },
    });
    expect(reg.status()).toBe(201);
    const userId = (await reg.json()).user.id;

    const login = await request.post('/auth/login', { data: { username, password } });
    const userToken = (await login.json()).token;

    const submit = await request.post('/users/kyc/submit', {
      headers: { Authorization: `Bearer ${userToken}` },
      multipart: validKycForm(),
    });
    expect(submit.status()).toBe(200);

    // Admin approves
    const adminToken = await getAdminToken(request);
    const approve = await request.post(`/admin/kyc/${userId}/approve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(approve.status()).toBe(200);
    const approveBody = await approve.json();
    expect(approveBody.status).toBe('verified');
    expect(approveBody.reviewedAt).toBeTruthy();

    // User can now see their verified status
    const get = await request.get('/users/kyc', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(get.status()).toBe(200);
    expect((await get.json()).status).toBe('verified');
  });
});

test.describe('POST /admin/kyc/:userId/reject', () => {
  test('401 when no Authorization header', async ({ request }) => {
    const res = await request.post('/admin/kyc/1/reject', {
      data: { reason: 'blurry document' },
    });
    expect(res.status()).toBe(401);
  });

  test('403 when token belongs to a non-admin user', async ({ request }) => {
    const token = await getRegularUserToken(request, 'admin_reject_nonadmin');
    const res = await request.post('/admin/kyc/1/reject', {
      headers: { Authorization: `Bearer ${token}` },
      data: { reason: 'blurry document' },
    });
    expect(res.status()).toBe(403);
  });

  test('400 when reason is missing (admin)', async ({ request }) => {
    test.skip(
      !adminCredentials(),
      'Set ADMIN_USERNAME and ADMIN_PASSWORD env vars to run admin-gated tests.',
    );
    const token = await getAdminToken(request);
    const res = await request.post('/admin/kyc/1/reject', {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Rejection reason is required.');
  });

  test('400 when user does not exist (admin, with reason)', async ({ request }) => {
    test.skip(
      !adminCredentials(),
      'Set ADMIN_USERNAME and ADMIN_PASSWORD env vars to run admin-gated tests.',
    );
    const token = await getAdminToken(request);
    const res = await request.post('/admin/kyc/999999999/reject', {
      headers: { Authorization: `Bearer ${token}` },
      data: { reason: 'document looks fake' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('User not found.');
  });
});
