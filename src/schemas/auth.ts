import { z } from 'zod';

/**
 * Input validation for the signup form (app/(auth)/signup.tsx via
 * useSignupForm.ts). The previous hand-rolled check only verified `email` was
 * non-empty (`!email.trim()`), never that it was a well-formed email address,
 * so e.g. "asdf" passed client-side validation. This only covers the fields
 * that are pure format/presence checks; the phone number's country-code
 * prefixing + digit-length check is a transformation rather than input
 * validation, so it's left as-is in useSignupForm.ts.
 */
export const SignupInputSchema = z.object({
  email: z.string().trim().min(1, 'Please fill in all required fields').email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().trim().min(1, 'Please fill in all required fields'),
});

export type SignupInput = z.infer<typeof SignupInputSchema>;
