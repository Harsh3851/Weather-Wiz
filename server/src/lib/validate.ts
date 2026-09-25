import type { ZodError, ZodTypeAny, z } from 'zod';
import { badRequest } from './errors';

export function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

/** Parses untrusted input or throws a 400 with field-level details. */
export function parseInput<S extends ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = formatZodError(result.error);
    throw badRequest(details[0]?.message ?? 'Invalid request', details);
  }
  return result.data;
}
