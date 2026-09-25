import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Logger } from 'pino';
import {
  DEFAULT_LOCATION,
  DEFAULT_PREFERENCES,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
} from '@weatherwiz/shared';
import type { AppConfig } from '../config/env';
import { AppError, conflict, notFound, unauthorized } from '../lib/errors';
import { generateRefreshToken, hashToken, signAccessToken } from '../lib/jwt';
import { RefreshToken } from '../models/RefreshToken';
import { SavedLocation } from '../models/SavedLocation';
import { AlertRule } from '../models/AlertRule';
import { User, toPublicUser, type UserDoc } from '../models/User';

const BCRYPT_ROUNDS = 12;
export const DEMO_EMAIL = 'demo@weatherwiz.app';

export interface AuthSession {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface AuthService {
  register(input: RegisterInput, userAgent?: string): Promise<AuthSession>;
  login(input: LoginInput, userAgent?: string): Promise<AuthSession>;
  loginDemo(userAgent?: string): Promise<AuthSession>;
  refresh(refreshToken: string, userAgent?: string): Promise<AuthSession>;
  logout(refreshToken: string | undefined): Promise<void>;
  getUser(userId: string): Promise<PublicUser>;
}

export function createAuthService(deps: { config: AppConfig; logger: Logger }): AuthService {
  const { config, logger } = deps;
  const rounds = config.env === 'test' ? 4 : BCRYPT_ROUNDS;
  // Constant-time-ish login: compare against a dummy hash when the user does not exist.
  const dummyHash = bcrypt.hashSync('not-a-real-password', rounds);

  async function issueSession(
    user: UserDoc,
    userAgent: string | undefined,
    family: string = crypto.randomUUID(),
  ): Promise<AuthSession> {
    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + config.jwt.refreshTtlDays * 86_400_000);
    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refreshToken, config.jwt.refreshSecret),
      family,
      expiresAt: refreshExpiresAt,
      userAgent: userAgent?.slice(0, 200) ?? null,
    });
    const accessToken = signAccessToken(
      { sub: user.id as string, demo: Boolean(user.isDemo) },
      config.jwt.accessSecret,
      config.jwt.accessTtl,
    );
    return { user: toPublicUser(user), accessToken, refreshToken, refreshExpiresAt };
  }

  async function seedDemoData(user: UserDoc) {
    await SavedLocation.insertMany([
      { userId: user._id, ...pick(DEFAULT_LOCATION), isDefault: true, order: 0 },
      {
        userId: user._id,
        name: 'Mumbai',
        country: 'India',
        countryCode: 'IN',
        admin1: 'Maharashtra',
        latitude: 19.07,
        longitude: 72.88,
        timezone: 'Asia/Kolkata',
        order: 1,
      },
      {
        userId: user._id,
        name: 'Bengaluru',
        country: 'India',
        countryCode: 'IN',
        admin1: 'Karnataka',
        latitude: 12.97,
        longitude: 77.59,
        timezone: 'Asia/Kolkata',
        order: 2,
      },
      {
        userId: user._id,
        name: 'London',
        country: 'United Kingdom',
        countryCode: 'GB',
        admin1: 'England',
        latitude: 51.51,
        longitude: -0.13,
        timezone: 'Europe/London',
        order: 3,
      },
    ]);
    await AlertRule.create({
      userId: user._id,
      locationName: DEFAULT_LOCATION.name,
      latitude: DEFAULT_LOCATION.latitude,
      longitude: DEFAULT_LOCATION.longitude,
      metric: 'temperatureMax',
      operator: 'gt',
      threshold: 30,
      day: 'tomorrow',
    });
  }

  return {
    async register(input, userAgent) {
      const exists = await User.exists({ email: input.email });
      if (exists) throw conflict('An account with this email already exists');
      const passwordHash = await bcrypt.hash(input.password, rounds);
      try {
        const user = await User.create({ name: input.name, email: input.email, passwordHash });
        return issueSession(user, userAgent);
      } catch (err) {
        if ((err as { code?: number }).code === 11000) {
          throw conflict('An account with this email already exists');
        }
        throw err;
      }
    },

    async login(input, userAgent) {
      const user = await User.findOne({ email: input.email }).select('+passwordHash');
      const ok = await bcrypt.compare(input.password, user?.passwordHash ?? dummyHash);
      if (!user || !ok) throw unauthorized('Invalid email or password');
      return issueSession(user, userAgent);
    },

    async loginDemo(userAgent) {
      let user = await User.findOne({ email: DEMO_EMAIL });
      if (!user) {
        try {
          user = await User.create({
            name: 'Demo User',
            email: DEMO_EMAIL,
            passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), rounds),
            isDemo: true,
            preferences: DEFAULT_PREFERENCES,
          });
          await seedDemoData(user);
          logger.info('demo account created');
        } catch (err) {
          // Two concurrent first-time demo logins: the loser reuses the winner's account.
          if ((err as { code?: number }).code !== 11000) throw err;
          user = await User.findOne({ email: DEMO_EMAIL });
          if (!user) throw err;
        }
      }
      return issueSession(user, userAgent);
    },

    async refresh(refreshToken, userAgent) {
      const tokenHash = hashToken(refreshToken, config.jwt.refreshSecret);
      const stored = await RefreshToken.findOne({ tokenHash });
      if (!stored || stored.expiresAt <= new Date()) {
        throw unauthorized('Session expired, please sign in again');
      }
      if (stored.revokedAt) {
        // A rotated token was presented again: assume theft and kill the whole family.
        await RefreshToken.updateMany(
          { family: stored.family, revokedAt: null },
          { $set: { revokedAt: new Date() } },
        );
        logger.warn({ userId: String(stored.userId) }, 'refresh token reuse detected');
        throw unauthorized('Session is no longer valid, please sign in again');
      }
      const user = await User.findById(stored.userId);
      if (!user) throw unauthorized('Account no longer exists');

      const session = await issueSession(user, userAgent, stored.family);
      stored.revokedAt = new Date();
      stored.replacedBy = hashToken(session.refreshToken, config.jwt.refreshSecret);
      await stored.save();
      return session;
    },

    async logout(refreshToken) {
      if (!refreshToken) return;
      await RefreshToken.updateOne(
        { tokenHash: hashToken(refreshToken, config.jwt.refreshSecret), revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
    },

    async getUser(userId) {
      const user = await User.findById(userId);
      if (!user) throw notFound('User not found');
      return toPublicUser(user);
    },
  };
}

function pick(loc: typeof DEFAULT_LOCATION) {
  return {
    name: loc.name,
    country: loc.country,
    countryCode: loc.countryCode,
    admin1: loc.admin1,
    latitude: loc.latitude,
    longitude: loc.longitude,
    timezone: loc.timezone,
  };
}

export { AppError };
