export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const ACCESS_TOKEN_TTL = '10m';
export const REFRESH_TOKEN_TTL = '15d';
export const BCRYPT_COST = 12;
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
};
