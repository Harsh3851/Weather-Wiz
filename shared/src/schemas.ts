import { z } from 'zod';
import { MAX_FORECAST_DAYS, MIN_FORECAST_DAYS } from './openMeteo';

export const latitudeSchema = z.coerce.number().min(-90).max(90);
export const longitudeSchema = z.coerce.number().min(-180).max(180);

export const coordinatesQuerySchema = z.object({
  lat: latitudeSchema,
  lon: longitudeSchema,
});

export const forecastQuerySchema = coordinatesQuerySchema.extend({
  days: z.coerce.number().int().min(MIN_FORECAST_DAYS).max(MAX_FORECAST_DAYS).optional(),
});

export const geocodeQuerySchema = z.object({
  q: z.string().trim().min(2, 'Search term must be at least 2 characters').max(100),
  count: z.coerce.number().int().min(1).max(20).optional(),
});

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});

export const preferencesSchema = z.object({
  temperatureUnit: z.enum(['celsius', 'fahrenheit']),
  windUnit: z.enum(['kmh', 'ms']),
  timeFormat: z.enum(['12h', '24h']),
  theme: z.enum(['system', 'light', 'dark']),
});

export const preferencesPatchSchema = preferencesSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one preference');

export const locationInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  country: z.string().trim().max(80).nullable().optional(),
  countryCode: z.string().trim().max(3).nullable().optional(),
  admin1: z.string().trim().max(120).nullable().optional(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: z.string().trim().max(64).nullable().optional(),
});

export const savedLocationInputSchema = locationInputSchema.extend({
  isDefault: z.boolean().optional(),
});

export const savedLocationPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field');

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
});

export const alertRuleInputSchema = z.object({
  locationName: z.string().trim().min(1).max(120),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  metric: z.enum([
    'precipitationProbability',
    'precipitationSum',
    'temperatureMax',
    'temperatureMin',
    'windSpeedMax',
    'uvIndexMax',
  ]),
  operator: z.enum(['gt', 'lt']),
  threshold: z.coerce.number().min(-100).max(1000),
  day: z.enum(['today', 'tomorrow']),
  enabled: z.boolean().optional(),
});

export const alertRulePatchSchema = z.object({ enabled: z.boolean() });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LocationInput = z.infer<typeof locationInputSchema>;
export type SavedLocationInput = z.infer<typeof savedLocationInputSchema>;
export type SavedLocationPatch = z.infer<typeof savedLocationPatchSchema>;
export type AlertRuleInput = z.infer<typeof alertRuleInputSchema>;
export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>;
