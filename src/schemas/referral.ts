import { z } from 'zod';

/** GET /agents/referral-info?code=... */
export const ReferralInfoSchema = z
  .object({
    agent_name: z.string().min(1).optional(),
  })
  .passthrough();

export type ReferralInfo = z.infer<typeof ReferralInfoSchema>;
