import { apiGet, apiPost } from '@/src/services/api';
import { parseApiResponse } from '@/src/lib/parseApi';
import {
  AiChatInputSchema,
  AiChatResponseSchema,
  ConversationMessagesResponseSchema,
  LiveMessageInputSchema,
  SupportTicketCreatedSchema,
  SupportTicketsResponseSchema,
  type LiveSupportMessage,
  type SupportTicket,
} from '@/src/schemas/support';

export async function fetchSupportTickets(accessToken: string): Promise<SupportTicket[]> {
  const res = await apiGet<unknown>('/support/tickets', accessToken);
  const parsed = parseApiResponse(SupportTicketsResponseSchema, res);
  if (Array.isArray(parsed)) return parsed;
  return parsed.tickets ?? [];
}

export async function fetchConversationMessages(
  conversationId: string,
  accessToken: string
): Promise<LiveSupportMessage[]> {
  const res = await apiGet<unknown>(`/conversations/${conversationId}/messages`, accessToken);
  const parsed = parseApiResponse(ConversationMessagesResponseSchema, res);
  if (Array.isArray(parsed)) return parsed;
  return parsed.data || parsed.messages || [];
}

export async function postConversationMessage(conversationId: string, body: object, accessToken: string) {
  parseApiResponse(LiveMessageInputSchema, body);
  return apiPost(`/conversations/${conversationId}/messages`, body, accessToken);
}

export async function postSupportAiChat(payload: object, accessToken?: string | null) {
  parseApiResponse(AiChatInputSchema, payload);
  const res = await apiPost<unknown>('/support/ai-chat', payload, accessToken);
  return parseApiResponse(AiChatResponseSchema, res);
}

export async function createSupportTicket(body: object, accessToken?: string | null) {
  const res = await apiPost<unknown>('/support/tickets', body, accessToken);
  return parseApiResponse(SupportTicketCreatedSchema, res);
}
