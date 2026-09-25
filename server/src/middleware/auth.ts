import type { RequestHandler } from 'express';
import { unauthorized } from '../lib/errors';
import { verifyAccessToken } from '../lib/jwt';

function readBearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

export function requireAuth(accessSecret: string): RequestHandler {
  return (req, _res, next) => {
    const token = readBearer(req.headers.authorization);
    if (!token) return next(unauthorized());
    try {
      const payload = verifyAccessToken(token, accessSecret);
      req.auth = { userId: payload.sub, isDemo: Boolean(payload.demo) };
      next();
    } catch {
      next(unauthorized('Access token is invalid or expired'));
    }
  };
}

/** Helper for controllers behind requireAuth. */
export function userIdOf(req: { auth?: { userId: string } }): string {
  if (!req.auth) throw unauthorized();
  return req.auth.userId;
}
