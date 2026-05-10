import type { APIRequestContext } from '@playwright/test';
import { uniqueUsername, randomEthAddress } from './helpers';

export const adminCredentials = (): { username: string; password: string } | null => {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return null;
  return { username, password };
};

export const getAdminToken = async (request: APIRequestContext): Promise<string> => {
  const creds = adminCredentials();
  if (!creds) {
    throw new Error(
      'ADMIN_USERNAME and ADMIN_PASSWORD env vars must be set (admin user must already exist in DB with role=admin).',
    );
  }
  const res = await request.post('/auth/login', { data: creds });
  if (res.status() !== 200) {
    throw new Error(`Admin login failed (${res.status()}): ${await res.text()}`);
  }
  const body = await res.json();
  return body.token as string;
};

export const getRegularUserToken = async (
  request: APIRequestContext,
  prefix = 'reg_user',
): Promise<string> => {
  const username = uniqueUsername(prefix);
  const password = 'lozinka123';
  await request.post('/auth/register', {
    data: { username, password, ethAddress: randomEthAddress() },
  });
  const res = await request.post('/auth/login', { data: { username, password } });
  const body = await res.json();
  return body.token as string;
};
