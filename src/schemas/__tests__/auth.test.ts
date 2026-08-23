import { SignupInputSchema } from '@/src/schemas/auth';

function validInput(overrides: Partial<Record<string, string>> = {}) {
  return {
    email: 'jane@example.com',
    password: 'password123',
    fullName: 'Jane Doe',
    ...overrides,
  };
}

describe('SignupInputSchema', () => {
  it('parses valid input', () => {
    const result = SignupInputSchema.safeParse(validInput());
    expect(result.success).toBe(true);
  });

  it('fails when email is missing', () => {
    const result = SignupInputSchema.safeParse(validInput({ email: '' }));
    expect(result.success).toBe(false);
  });

  it('fails when email is not a well-formed address (e.g. "asdf")', () => {
    const result = SignupInputSchema.safeParse(validInput({ email: 'asdf' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/valid email/i);
    }
  });

  it('fails when password is shorter than 6 characters', () => {
    const result = SignupInputSchema.safeParse(validInput({ password: '123' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Password must be at least 6 characters');
    }
  });

  it('accepts a password exactly 6 characters long', () => {
    const result = SignupInputSchema.safeParse(validInput({ password: '123456' }));
    expect(result.success).toBe(true);
  });

  it('fails when fullName is missing', () => {
    const result = SignupInputSchema.safeParse(validInput({ fullName: '' }));
    expect(result.success).toBe(false);
  });

  it('fails when fullName is only whitespace', () => {
    const result = SignupInputSchema.safeParse(validInput({ fullName: '   ' }));
    expect(result.success).toBe(false);
  });
});
