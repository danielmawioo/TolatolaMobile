import { apiPost } from '@/src/services/api';
import {
  CheckoutOrderInputSchema,
  CreatedOrderResponseSchema,
  PaymentInitiateInputSchema,
  PaymentInitiateResponseSchema,
} from '@/src/schemas/checkout';

/** Validate and submit POST /orders. Response is parsed at the API boundary. */
export function createOrder(body: object, accessToken?: string | null) {
  // ZodError on invalid outbound payload — never hit the network with bad shapes.
  CheckoutOrderInputSchema.parse(body);
  return apiPost('/orders', body, accessToken, CreatedOrderResponseSchema);
}

/** Validate and submit POST /payments/mobile/initiate. */
export function initiateCheckoutPayment(body: object, accessToken?: string | null) {
  PaymentInitiateInputSchema.parse(body);
  return apiPost('/payments/mobile/initiate', body, accessToken, PaymentInitiateResponseSchema);
}
