import { z } from 'zod';
import { AppError } from '@/src/lib/errors';

/**
 * Validate a request or response payload at an API boundary.
 * Callers get a typed value or a validation AppError — never a silent shape mismatch.
 */
export function parseApiResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path?.length ? issue.path.join('.') : 'payload';
    const detail = issue ? `${path}: ${issue.message}` : 'payload did not match the expected shape';
    throw new AppError(`Invalid API payload (${detail})`, 'validation');
  }
  return parsed.data;
}
