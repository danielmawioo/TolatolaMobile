import { z } from 'zod';

const idSchema = z.union([z.string(), z.number()]);

/** Body of POST /orders from the checkout submit hook. */
export const CheckoutOrderInputSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            product_id: z.string().min(1),
            quantity: z.number().positive(),
            price: z.number().nonnegative(),
            shop_id: z.string(),
          })
          .passthrough()
      )
      .min(1),
    shippingAddress: z
      .object({
        full_name: z.string().min(1),
        phone: z.string().min(1),
        region: z.string().min(1),
        district: z.string().min(1),
        ward: z.string().min(1),
        street: z.string().min(1),
      })
      .passthrough(),
    totalAmount: z.number(),
    paymentMethod: z.string().min(1),
  })
  .passthrough();

/** POST /orders response. The id may sit on the root or under `order`. */
export const CreatedOrderResponseSchema = z
  .object({
    id: idSchema.optional(),
    order: z.object({ id: idSchema }).passthrough().optional(),
  })
  .passthrough();

export const PaymentInitiateInputSchema = z
  .object({
    orderId: idSchema,
    provider: z.string().min(1),
    amount: z.number(),
    currency: z.string().min(1),
  })
  .passthrough();

export const PaymentInitiateResponseSchema = z
  .object({
    success: z.boolean().optional(),
    message: z.string().optional(),
    transactionId: z.string().optional(),
    payment_intent_id: z.string().optional(),
    controlNumber: z.string().optional(),
  })
  .passthrough();
