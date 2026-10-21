import { z } from 'zod';

const optionalText = z.string().nullish();
const optionalNumber = z.union([z.number(), z.string()]).nullish();

const ShopSchema = z
  .object({
    name: optionalText,
    district: optionalText,
    region: optionalText,
    address: optionalText,
    phone: optionalText,
    latitude: optionalNumber,
    longitude: optionalNumber,
  })
  .passthrough();

const ShippingAddressSchema = z
  .object({
    full_name: optionalText,
    district: optionalText,
    region: optionalText,
    street: optionalText,
    address: optionalText,
    ward: optionalText,
    latitude: optionalNumber,
    longitude: optionalNumber,
  })
  .passthrough();

/**
 * One row from GET /transporter/jobs. `.passthrough()` keeps fields the card
 * does not read yet; required `id` and `status` are what every action needs.
 */
export const TransporterAssignmentSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    status: z.string().min(1),
    is_available_order: z.boolean().nullish(),
    accepted_at: optionalText,
    delivered_at: optionalText,
    order_id: optionalText,
    delivery_fee: optionalNumber,
    distance_km: optionalNumber,
    transport_methods: z.object({ name: optionalText }).passthrough().nullish(),
    shops: ShopSchema.nullish(),
    orders: z
      .object({
        order_number: z.union([z.string(), z.number()]).nullish(),
        users: z.object({ full_name: optionalText, phone: optionalText }).passthrough().nullish(),
        shipping_address: ShippingAddressSchema.nullish(),
      })
      .passthrough()
      .nullish(),
  })
  .passthrough();

export type TransporterAssignment = z.infer<typeof TransporterAssignmentSchema>;

/** GET /transporter/jobs may be a bare array or wrapped in `assignments` / `data`. */
export const TransporterJobsResponseSchema = z.union([
  z.array(TransporterAssignmentSchema),
  z.object({ assignments: z.array(TransporterAssignmentSchema) }).passthrough(),
  z.object({ data: z.array(TransporterAssignmentSchema) }).passthrough(),
]);

export const AssignmentStatusBodySchema = z.object({
  status: z.string().min(1),
  picked_up_at: z.string().optional(),
  delivered_at: z.string().optional(),
});

export const DeliveryPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'Delivery PIN must be 4 digits'),
});

export function unwrapTransporterJobs(data: unknown): TransporterAssignment[] {
  const parsed = TransporterJobsResponseSchema.safeParse(data);
  if (!parsed.success) return [];
  const value = parsed.data;
  if (Array.isArray(value)) return value;
  if ('assignments' in value && Array.isArray(value.assignments)) return value.assignments;
  if ('data' in value && Array.isArray(value.data)) return value.data;
  return [];
}
