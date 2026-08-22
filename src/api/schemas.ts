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

/**
 * Fields of a created-order response (`POST /orders`, and the guest-checkout
 * fallback paths) actually consumed by `src/api/orders.ts` (`createOrder` /
 * `unwrapCreatedOrder`): just enough to build the `{ id, order_number,
 * tracking_code, status }` result those functions return. `.passthrough()`
 * because the real order object carries many more fields (totals, line items,
 * shipping address, timestamps, ...) that these call sites never read.
 */
export const OrderResponseSchema = z
  .object({
    id: z.union([z.string(), z.number()]).nullish(),
    order_number: z.union([z.string(), z.number()]).nullish(),
    tracking_code: z.union([z.string(), z.number()]).nullish(),
    status: z.string().nullish(),
  })
  .passthrough();

export type OrderResponse = z.infer<typeof OrderResponseSchema>;

/**
 * Fields of a payment-status response actually consumed by
 * `src/api/payments.ts` (`fetchPaymentStatus`, `GET /payments/:lookupId`) and
 * mirrored by the equivalent shape polled from `GET /payments/status/:orderId`
 * in `src/hooks/usePaymentStatus.ts`: a top-level `status`/`payment_status`,
 * or the same pair nested under `data` when the backend wraps its response.
 * `.passthrough()` for everything else on the payload.
 */
export const PaymentStatusResponseSchema = z
  .object({
    status: z.string().nullish(),
    payment_status: z.string().nullish(),
    data: z
      .object({
        status: z.string().nullish(),
        payment_status: z.string().nullish(),
      })
      .passthrough()
      .nullish(),
  })
  .passthrough();

export type PaymentStatusResponse = z.infer<typeof PaymentStatusResponseSchema>;
