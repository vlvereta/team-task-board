// Web Crypto helpers: PBKDF2 password hashing and JWT-shaped HMAC tokens.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const toBase64Url = (bytes: Uint8Array) =>
  bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('bad base64url');
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  return base64ToBytes(padded + '='.repeat((4 - (padded.length % 4)) % 4));
}

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function randomSecret(): string {
  return bytesToBase64(randomBytes(32));
}

/** Compares two strings without bailing out at the first difference. */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

export interface PasswordRecord {
  passwordHash: string;
  salt: string;
  iterations: number;
}

export async function hashPassword(password: string, iterations: number): Promise<PasswordRecord> {
  const salt = randomBytes(16);
  return {
    passwordHash: await pbkdf2(password, salt, iterations),
    salt: bytesToBase64(salt),
    iterations,
  };
}

export async function verifyPassword(password: string, record: PasswordRecord): Promise<boolean> {
  const hash = await pbkdf2(password, base64ToBytes(record.salt), record.iterations);
  return safeEqual(hash, record.passwordHash);
}

export interface TokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

async function hmac(secret: string, data: string): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(data)));
}

export async function signToken(payload: TokenPayload, secret: string): Promise<string> {
  const header = toBase64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = toBase64Url(await hmac(secret, `${header}.${body}`));
  return `${header}.${body}.${sig}`;
}

/** Returns the payload for a well-formed, correctly signed token; otherwise null. Does not check expiry. */
export async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts as [string, string, string];
    const expected = toBase64Url(await hmac(secret, `${header}.${body}`));
    if (!safeEqual(expected, sig)) return null;
    const payload: unknown = JSON.parse(decoder.decode(fromBase64Url(body)));
    if (typeof payload !== 'object' || payload === null) return null;
    const { sub, iat, exp } = payload as Record<string, unknown>;
    if (typeof sub !== 'string' || typeof iat !== 'number' || typeof exp !== 'number') return null;
    return { sub, iat, exp };
  } catch {
    return null;
  }
}
