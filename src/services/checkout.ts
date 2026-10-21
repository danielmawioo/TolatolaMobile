import { apiPost } from '@/src/services/api';
import { parseApiResponse } from '@/src/lib/parseApi';
import {
  CheckoutOrderInputSchema,
  CreatedOrderResponseSchema,
  PaymentInitiateInputSchema,
  PaymentInitiateResponseSchema,
} from '@/src/schemas/checkout';

/** Validate and submit POST /orders. Response is parsed at the API boundary. */
export function createOrder(body: object, accessToken?: string | null) {
  parseApiResponse(CheckoutOrderInputSchema, body);
  return apiPost('/orders', body, accessToken, CreatedOrderResponseSchema);
}

/** Validate and submit POST /payments/mobile/initiate. */
export function initiateCheckoutPayment(body: object, accessToken?: string | null) {
  parseApiResponse(PaymentInitiateInputSchema, body);
  return apiPost('/payments/mobile/initiate', body, accessToken, PaymentInitiateResponseSchema);
}
