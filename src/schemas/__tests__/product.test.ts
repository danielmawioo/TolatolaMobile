import { ProductInputSchema, CreateProductInputSchema, UpdateProductInputSchema } from '@/src/schemas/product';

function validInput(overrides: Partial<Record<string, string>> = {}) {
  return {
    name: 'Rice',
    price: '10000',
    stock_quantity: '5',
    category_id: 'agri-rice',
    ...overrides,
  };
}

describe('ProductInputSchema', () => {
  it('parses valid input', () => {
    const result = ProductInputSchema.safeParse(validInput());
    expect(result.success).toBe(true);
  });

  it('passes unrelated form fields through untouched (.passthrough())', () => {
    const result = ProductInputSchema.safeParse(validInput({ description: 'Fresh rice', weight_unit: 'Kg' }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('Fresh rice');
      expect(result.data.weight_unit).toBe('Kg');
    }
  });

  it('fails when name is missing', () => {
    const result = ProductInputSchema.safeParse(validInput({ name: '' }));
    expect(result.success).toBe(false);
  });

  it('fails when name is only whitespace', () => {
    const result = ProductInputSchema.safeParse(validInput({ name: '   ' }));
    expect(result.success).toBe(false);
  });

  it('fails when category_id is missing', () => {
    const result = ProductInputSchema.safeParse(validInput({ category_id: '' }));
    expect(result.success).toBe(false);
  });

  it('fails when price is empty', () => {
    const result = ProductInputSchema.safeParse(validInput({ price: '' }));
    expect(result.success).toBe(false);
  });

  it('fails when price is non-numeric garbage (e.g. a stray currency symbol)', () => {
    const result = ProductInputSchema.safeParse(validInput({ price: 'TSh 10,000' }));
    expect(result.success).toBe(false);
  });

  it('fails when price is zero or negative', () => {
    expect(ProductInputSchema.safeParse(validInput({ price: '0' })).success).toBe(false);
    expect(ProductInputSchema.safeParse(validInput({ price: '-5' })).success).toBe(false);
  });

  it('accepts a decimal price', () => {
    const result = ProductInputSchema.safeParse(validInput({ price: '10.50' }));
    expect(result.success).toBe(true);
  });

  it('fails when stock_quantity is empty', () => {
    const result = ProductInputSchema.safeParse(validInput({ stock_quantity: '' }));
    expect(result.success).toBe(false);
  });

  it('fails when stock_quantity is non-numeric garbage', () => {
    const result = ProductInputSchema.safeParse(validInput({ stock_quantity: 'lots' }));
    expect(result.success).toBe(false);
  });

  it('fails when stock_quantity is negative', () => {
    const result = ProductInputSchema.safeParse(validInput({ stock_quantity: '-1' }));
    expect(result.success).toBe(false);
  });

  it('fails when stock_quantity is not a whole number', () => {
    const result = ProductInputSchema.safeParse(validInput({ stock_quantity: '2.5' }));
    expect(result.success).toBe(false);
  });

  it('accepts a stock_quantity of exactly 0 (out of stock is valid)', () => {
    const result = ProductInputSchema.safeParse(validInput({ stock_quantity: '0' }));
    expect(result.success).toBe(true);
  });

  it('exposes the same schema for create and update forms', () => {
    expect(CreateProductInputSchema).toBe(ProductInputSchema);
    expect(UpdateProductInputSchema).toBe(ProductInputSchema);
  });
});
