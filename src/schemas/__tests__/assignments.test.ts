import { AppError } from '@/src/lib/errors';
import { parseApiResponse } from '@/src/lib/parseApi';
import {
  DeliveryPinSchema,
  TransporterJobsResponseSchema,
  unwrapTransporterJobs,
} from '@/src/schemas/assignments';

const job = {
  id: 'a1',
  status: 'assigned',
  is_available_order: true,
  order_id: 'order-1',
  orders: { order_number: '1001' },
};

describe('assignment schemas', () => {
  it('accepts a bare array and a wrapped jobs payload', () => {
    expect(unwrapTransporterJobs([job])).toEqual([expect.objectContaining({ id: 'a1', status: 'assigned' })]);
    expect(unwrapTransporterJobs({ assignments: [job] })).toHaveLength(1);
    expect(unwrapTransporterJobs({ data: [job] })).toHaveLength(1);
  });

  it('rejects a malformed jobs payload', () => {
    expect(TransporterJobsResponseSchema.safeParse({ assignments: [{ status: 'assigned' }] }).success).toBe(false);
    expect(unwrapTransporterJobs({ nope: true })).toEqual([]);
    expect(() => parseApiResponse(TransporterJobsResponseSchema, { nope: true })).toThrow(AppError);
  });

  it('rejects a delivery PIN that is not 4 digits', () => {
    expect(DeliveryPinSchema.safeParse({ pin: '12' }).success).toBe(false);
    expect(DeliveryPinSchema.safeParse({ pin: '1234' }).success).toBe(true);
  });
});
