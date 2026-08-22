import React from 'react';
import { View, Text, Pressable, Image, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import type { Message } from '@/src/hooks/useSupportChat';

interface ChatMessageBubbleProps {
  message: Message;
  avatarUri: string;
  hasActiveTicket: boolean;
  isEscalating: boolean;
  inactivityPromptActive: boolean;
  secondsRemaining: number;
  onEscalate: () => void;
  onContinueSession: () => void;
  onEndSession: () => void;
}

/**
 * Renders a single chat row: avatar (for bot/agent), the message bubble
 * itself (with optional image/PDF attachment), and any inline actions the
 * message carries — the "connect to human support" escalation button, or
 * the inactivity termination countdown prompt.
 */
export function ChatMessageBubble({
  message,
  avatarUri,
  hasActiveTicket,
  isEscalating,
  inactivityPromptActive,
  secondsRemaining,
  onEscalate,
  onContinueSession,
  onEndSession,
}: ChatMessageBubbleProps) {
  const isUser = message.sender === 'user';
  const isImage = message.attachmentType?.startsWith('image/') || message.attachmentUrl?.startsWith('data:image/');

  return (
    <View style={[s.msgWrapper, isUser ? s.msgWrapperUser : s.msgWrapperBot]}>
      {!isUser && <Image source={{ uri: avatarUri }} style={s.msgAvatar} />}
      <View style={[s.msgBubble, isUser ? s.msgBubbleUser : s.msgBubbleBot]}>
        {/* Message Attachment Rendering */}
        {message.attachmentUrl && (
          <View style={s.attachmentContainer}>
            {isImage ? (
              <Image source={{ uri: message.attachmentUrl }} style={s.msgImageAttachment} resizeMode="cover" />
            ) : (
              <Pressable style={s.pdfCard} onPress={() => Linking.openURL(message.attachmentUrl!)}>
                <View style={s.pdfIconBadge}>
                  <FontAwesome name="file-pdf-o" size={18} color="#dc2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.pdfNameText} numberOfLines={1}>
                    {message.attachmentName || 'PDF Document'}
                  </Text>
                  <Text style={s.pdfSubText}>Tap to open PDF</Text>
                </View>
                <FontAwesome name="external-link" size={12} color="#94a3b8" />
              </Pressable>
            )}
          </View>
        )}

        <Text style={[s.msgText, isUser ? s.msgTextUser : s.msgTextBot]}>{message.text}</Text>
        <Text style={[s.msgTime, isUser ? s.msgTimeUser : s.msgTimeBot]}>{message.timestamp}</Text>

        {/* Human Escalation Option */}
        {message.showEscalationOption && !hasActiveTicket && (
          <Pressable
            style={({ pressed }) => [s.escalateBtn, pressed && { opacity: 0.85 }]}
            onPress={onEscalate}
            disabled={isEscalating}
          >
            {isEscalating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <FontAwesome name="headphones" size={14} color="#fff" />
                <Text style={s.escalateBtnText}>Connect to Human Support</Text>
              </>
            )}
          </Pressable>
        )}

        {/* 1-Hour Inactivity Termination Action Prompt */}
        {message.showInactivityPrompt && inactivityPromptActive && (
          <View style={s.inactivityPromptContainer}>
            <Text style={s.inactivityTimerText}>
              Ending automatically in {Math.floor(secondsRemaining / 60)}m {secondsRemaining % 60}s...
            </Text>
            <View style={s.inactivityBtnRow}>
              <Pressable style={s.continueBtn} onPress={onContinueSession}>
                <FontAwesome name="refresh" size={12} color="#fff" />
                <Text style={s.continueBtnText}>Continue</Text>
              </Pressable>
              <Pressable style={s.endBtn} onPress={onEndSession}>
                <FontAwesome name="sign-out" size={12} color="#dc2626" />
                <Text style={s.endBtnText}>End Chat</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  msgWrapper: { flexDirection: 'row', gap: 10, maxWidth: '85%' },
  msgWrapperUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgWrapperBot: { alignSelf: 'flex-start' },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  msgBubble: { borderRadius: 18, padding: 14, gap: 6 },
  msgBubbleUser: { backgroundColor: Theme.primary, borderBottomRightRadius: 4 },
  msgBubbleBot: { backgroundColor: '#f1f5f9', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, lineHeight: 21 },
  msgTextUser: { color: '#ffffff' },
  msgTextBot: { color: '#1e293b' },
  msgTime: { fontSize: 10, marginTop: 2 },
  msgTimeUser: { color: 'rgba(255,255,255,0.7)', alignSelf: 'flex-end' },
  msgTimeBot: { color: '#94a3b8', alignSelf: 'flex-start' },

  attachmentContainer: { marginBottom: 6 },
  msgImageAttachment: {
    width: 200,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  pdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  pdfIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfNameText: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  pdfSubText: { fontSize: 10, color: '#64748b' },

  escalateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  escalateBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  inactivityPromptContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    gap: 8,
  },
  inactivityTimerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
  },
  inactivityBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  continueBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 8,
    borderRadius: 8,
  },
  continueBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  endBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 8,
    borderRadius: 8,
  },
  endBtnText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
});
