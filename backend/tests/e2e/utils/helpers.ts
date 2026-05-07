export const uniqueUsername = (prefix = 'testuser'): string =>
  `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

export const randomEthAddress = (): string => {
  const hex = Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
  return `0x${hex}`;
};

export const isJwt = (token: unknown): boolean =>
  typeof token === 'string' && token.split('.').length === 3 && token.length > 20;
