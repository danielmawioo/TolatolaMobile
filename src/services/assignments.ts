import { apiGet, apiPatch, apiPost } from '@/src/services/api';
import { parseApiResponse } from '@/src/lib/parseApi';
import { AppError } from '@/src/lib/errors';
import {
  AssignmentStatusBodySchema,
  DeliveryPinSchema,
  TransporterJobsResponseSchema,
  type TransporterAssignment,
} from '@/src/schemas/assignments';

/**
 * Transporter assignment domain: fetch jobs and apply status / PIN transitions.
 * UI components call these instead of talking to the HTTP client directly.
 */
export async function fetchTransporterAssignments(accessToken: string): Promise<TransporterAssignment[]> {
  const res = await apiGet<unknown>('/transporter/jobs', accessToken, TransporterJobsResponseSchema);
  const parsed = parseApiResponse(TransporterJobsResponseSchema, res);
  if (Array.isArray(parsed)) return parsed;
  if ('assignments' in parsed && Array.isArray(parsed.assignments)) return parsed.assignments;
  if ('data' in parsed && Array.isArray(parsed.data)) return parsed.data;
  throw new AppError('Assignments response failed validation', 'validation');
}

export async function updateAssignmentStatus(params: {
  id: string;
  newStatus: string;
  isAvailable?: boolean;
  orderId?: string;
  accessToken: string;
}): Promise<void> {
  const { id, newStatus, isAvailable, orderId, accessToken } = params;
  if (isAvailable && newStatus === 'accepted' && orderId) {
    await apiPost(`/assignments/accept/${orderId}`, {}, accessToken);
    return;
  }
  const data: { status: string; picked_up_at?: string; delivered_at?: string } = { status: newStatus };
  if (newStatus === 'picked_up') data.picked_up_at = new Date().toISOString();
  if (newStatus === 'delivered') data.delivered_at = new Date().toISOString();
  const body = AssignmentStatusBodySchema.parse(data);
  await apiPatch(`/assignments/${id}`, body, accessToken);
}

export async function verifyAssignmentPin(id: string, pin: string, accessToken: string): Promise<void> {
  const body = DeliveryPinSchema.parse({ pin });
  await apiPost(`/assignments/${id}/verify-pin`, body, accessToken);
}

export async function requestDeliveryConfirmation(id: string, accessToken: string): Promise<void> {
  await apiPost(`/assignments/${id}/request-delivery-confirmation`, {}, accessToken);
}
