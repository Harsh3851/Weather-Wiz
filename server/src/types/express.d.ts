declare global {
  namespace Express {
    interface Request {
      /** Set by the auth middleware when a valid access token is present. */
      auth?: { userId: string; isDemo: boolean };
    }
  }
}

export {};
