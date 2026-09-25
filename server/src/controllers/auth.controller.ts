import type { CookieOptions, Request, Response } from 'express';
import { loginSchema, registerSchema } from '@weatherwiz/shared';
import type { AppConfig } from '../config/env';
import { unauthorized } from '../lib/errors';
import { parseInput } from '../lib/validate';
import { userIdOf } from '../middleware/auth';
import type { AuthService, AuthSession } from '../services/auth.service';

export const REFRESH_COOKIE = 'ww_refresh';

export function createAuthController(auth: AuthService, config: AppConfig) {
  const cookieBase: CookieOptions = {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/api/auth',
  };

  function sendSession(res: Response, session: AuthSession, status = 200) {
    res.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...cookieBase,
      expires: session.refreshExpiresAt,
    });
    res.set('Cache-Control', 'no-store');
    res.status(status).json({ user: session.user, accessToken: session.accessToken });
  }

  const readCookie = (req: Request): string | undefined => {
    const value = (req.cookies as Record<string, unknown> | undefined)?.[REFRESH_COOKIE];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  };

  return {
    async register(req: Request, res: Response) {
      const input = parseInput(registerSchema, req.body);
      sendSession(res, await auth.register(input, req.get('user-agent')), 201);
    },
    async login(req: Request, res: Response) {
      const input = parseInput(loginSchema, req.body);
      sendSession(res, await auth.login(input, req.get('user-agent')));
    },
    async demo(req: Request, res: Response) {
      sendSession(res, await auth.loginDemo(req.get('user-agent')));
    },
    async refresh(req: Request, res: Response) {
      const token = readCookie(req);
      if (!token) throw unauthorized('No active session');
      try {
        sendSession(res, await auth.refresh(token, req.get('user-agent')));
      } catch (err) {
        res.clearCookie(REFRESH_COOKIE, cookieBase);
        throw err;
      }
    },
    async logout(req: Request, res: Response) {
      await auth.logout(readCookie(req));
      res.clearCookie(REFRESH_COOKIE, cookieBase);
      res.status(204).end();
    },
    async me(req: Request, res: Response) {
      res.json({ user: await auth.getUser(userIdOf(req)) });
    },
  };
}
