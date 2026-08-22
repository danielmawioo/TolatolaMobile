import { z } from 'zod';

/**
 * Fields of a `/products/:id` response actually consumed by src/api/orders.ts
 * (shop resolution + per-unit weight for delivery pricing). `.passthrough()`
 * because the real API response carries many more fields we don't care about —
 * this only guards the shape of what we read, not the whole payload.
 */
export const ProductResponseSchema = z
  .object({
    shop_id: z.union([z.string(), z.number()]).nullish(),
    weight_kg: z.union([z.string(), z.number()]).nullish(),
    weightKg: z.union([z.string(), z.number()]).nullish(),
    weight: z.union([z.string(), z.number()]).nullish(),
  })
  .passthrough();

export type ProductResponse = z.infer<typeof ProductResponseSchema>;
