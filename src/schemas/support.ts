import { z } from 'zod';

const SupportTicketSchema = z
  .object({
    id: z.string(),
    status: z.string().optional(),
    conversation_id: z.string().nullable().optional(),
  })
  .passthrough();

export type SupportTicket = z.infer<typeof SupportTicketSchema>;

export const SupportTicketsResponseSchema = z.union([
  z.array(SupportTicketSchema),
  z.object({ tickets: z.array(SupportTicketSchema).optional() }).passthrough(),
]);

const LiveMessageSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    sender_type: z.string().optional(),
    message: z.string().optional(),
    created_at: z.string().optional(),
    attachment_url: z.string().nullable().optional(),
    attachment_type: z.string().nullable().optional(),
  })
  .passthrough();

export type LiveSupportMessage = z.infer<typeof LiveMessageSchema>;

export const ConversationMessagesResponseSchema = z.union([
  z.array(LiveMessageSchema),
  z
    .object({
      data: z.array(LiveMessageSchema).optional(),
      messages: z.array(LiveMessageSchema).optional(),
    })
    .passthrough(),
]);

export const AiChatInputSchema = z
  .object({
    message: z.string(),
    history: z.array(z.object({ sender: z.string(), text: z.string() }).passthrough()).optional(),
  })
  .passthrough();

export const AiChatResponseSchema = z
  .object({
    response: z.string().optional(),
    needs_human: z.boolean().optional(),
    ticket: SupportTicketSchema.optional(),
    conversation: z.object({ id: z.string().optional() }).passthrough().optional(),
  })
  .passthrough();

export const SupportTicketCreatedSchema = z
  .object({
    ticket: SupportTicketSchema,
    conversation: z.object({ id: z.string().optional() }).passthrough().optional(),
  })
  .passthrough();

export const LiveMessageInputSchema = z
  .object({
    message: z.string(),
    attachment_url: z.string().optional(),
    attachment_type: z.string().optional(),
  })
  .passthrough();
