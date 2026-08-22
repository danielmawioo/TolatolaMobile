import { isAmountRangeError } from '@/src/components/checkout/CheckoutErrorModal';

describe('isAmountRangeError', () => {
  it('returns false for null/empty errors', () => {
    expect(isAmountRangeError(null)).toBe(false);
    expect(isAmountRangeError('')).toBe(false);
  });

  it('detects an explicit "amount must be between" message', () => {
    expect(isAmountRangeError('Amount must be between 500 and 3000000')).toBe(true);
  });

  it('detects a message mentioning both range bounds without the exact phrase', () => {
    expect(isAmountRangeError('Payment failed: value should be within 500 - 3000000 TZS')).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isAmountRangeError('Network request failed')).toBe(false);
    expect(isAmountRangeError('Invalid phone number 500')).toBe(false);
  });
});
