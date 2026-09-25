import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string;
  demo?: boolean;
}

export function signAccessToken(
  payload: AccessTokenPayload,
  secret: string,
  expiresIn: string,
): string {
  return jwt.sign(payload, secret, {
    expiresIn: expiresIn as SignOptions['expiresIn'],
    issuer: 'weather-wiz',
    audience: 'weather-wiz-client',
  });
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  const decoded = jwt.verify(token, secret, {
    issuer: 'weather-wiz',
    audience: 'weather-wiz-client',
  });
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new Error('Malformed token');
  }
  return { sub: decoded.sub, demo: Boolean(decoded.demo) };
}

/** Opaque refresh tokens: random bytes handed to the client, only a hash is stored. */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashToken(token: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}
