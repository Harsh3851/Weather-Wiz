import rateLimit from 'express-rate-limit';

export function createRateLimiter(opts: { windowMs: number; max: number; message: string }) {
  return rateLimit({
    windowMs: opts.windowMs,
    limit: opts.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: opts.message, requestId: String(req.id ?? '') },
      });
    },
  });
}
