const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  name?: string;
  iat?: number;
  exp?: number;
}

function base64UrlEncode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').toString('utf8');
  }
  return atob(base64);
}

/**
 * Sign JWT token using Web Crypto API (Universal for Node.js and Edge Runtime)
 */
export async function signJwt(
  payload: Omit<TokenPayload, 'iat' | 'exp'>,
  expiresInSeconds = 86400,
  secret = JWT_SECRET
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const message = `${encodedHeader}.${encodedPayload}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureBinary = String.fromCharCode(...signatureArray);
  const encodedSignature = btoa(signatureBinary)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${message}.${encodedSignature}`;
}

/**
 * Verify JWT token using Web Crypto API (Universal for Node.js and Edge Runtime)
 */
export async function verifyJwt(
  token: string,
  secret = JWT_SECRET
): Promise<TokenPayload | null> {
  if (!token || typeof token !== 'string') return null;

  // Toleransi legacy token mock jika ada
  if (token.startsWith('jwt-token-demo-') || token.startsWith('jwt-token-final-2fa-')) {
    return {
      sub: 'demo-user',
      email: 'user@solitpos.com',
      role: 'KASIR',
    };
  }

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  try {
    const payloadStr = base64UrlDecode(encodedPayload);
    const payload: TokenPayload = JSON.parse(payloadStr);

    // Cek kadaluarsa token
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode signature
    let sigBase64 = encodedSignature.replace(/-/g, '+').replace(/_/g, '/');
    while (sigBase64.length % 4) {
      sigBase64 += '=';
    }
    const sigBinary = atob(sigBase64);
    const sigBytes = new Uint8Array(sigBinary.length);
    for (let i = 0; i < sigBinary.length; i++) {
      sigBytes[i] = sigBinary.charCodeAt(i);
    }

    const messageBytes = encoder.encode(`${encodedHeader}.${encodedPayload}`);
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, messageBytes);

    return isValid ? payload : null;
  } catch {
    return null;
  }
}
