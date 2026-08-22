import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Theme } from '@/constants/Theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { QUICK_SUGGESTIONS } from '@/src/data/supportFAQ';
import { useSupportChat } from '@/src/hooks/useSupportChat';
import { ChatMessageBubble } from '@/src/components/support/ChatMessageBubble';
import { AttachmentButton, AttachmentPreviewBar } from '@/src/components/support/AttachmentPicker';

const MOUREEN_AVATAR = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80';

export default function SupportChatScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, session } = useAuth();
  const params = useLocalSearchParams<{ initialQuery?: string }>();

  const flatListRef = useRef<FlatList>(null);
  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const chat = useSupportChat({
    isAuthenticated,
    accessToken: session?.access_token,
    initialQuery: params.initialQuery,
  });

  useEffect(() => {
    chat.scrollToBottomRef.current = scrollToBottom;
  }, [chat.scrollToBottomRef]);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Banner */}
      <View style={[s.topBanner, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={s.topBannerActions}>
          <Pressable style={s.closeCircleBtn} onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
            <FontAwesome name="chevron-left" size={16} color="#ffffff" />
          </Pressable>
          <Pressable style={s.closeCircleBtn} onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close Support Chat">
            <FontAwesome name="times" size={18} color="#ffffff" />
          </Pressable>
        </View>

        {/* Centered Moureen Tyler Avatar Header */}
        <View style={s.agentAvatarContainer}>
          <View style={s.avatarRing}>
            <Image source={{ uri: MOUREEN_AVATAR }} style={s.avatarImage} />
            <View style={s.onlineBadge} />
          </View>
          <Text style={s.agentGreeting}>Hello, I'm Moureen Tyler</Text>
          <Text style={s.agentSubtitle}>TOLA Digital Agent</Text>
        </View>
      </View>

      {/* Suggestion Chips */}
      {chat.messages.length <= 3 && (
        <View style={s.suggestionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.suggestionsScroll}>
            {QUICK_SUGGESTIONS.map((q, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]}
                onPress={() => chat.handleSend(q)}
              >
                <FontAwesome name="comment-o" size={12} color={Theme.primary} />
                <Text style={s.chipText}>{q}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Chat Messages */}
      <FlatList
        ref={flatListRef}
        data={chat.messages}
        keyExtractor={item => item.id}
        contentContainerStyle={s.messageList}
        renderItem={({ item }) => (
          <ChatMessageBubble
            message={item}
            avatarUri={MOUREEN_AVATAR}
            hasActiveTicket={!!chat.activeTicket}
            isEscalating={chat.isEscalating}
            inactivityPromptActive={chat.inactivityPromptActive}
            secondsRemaining={chat.secondsRemaining}
            onEscalate={chat.handleEscalateToHuman}
            onContinueSession={chat.handleContinueChatSession}
            onEndSession={() => chat.handleEndChatSession('user')}
          />
        )}
        ListFooterComponent={
          chat.isTyping ? (
            <View style={[s.msgWrapper, s.msgWrapperBot]}>
              <Image source={{ uri: MOUREEN_AVATAR }} style={s.msgAvatar} />
              <View style={[s.msgBubble, s.msgBubbleBot, { paddingVertical: 12, paddingHorizontal: 16 }]}>
                <ActivityIndicator size="small" color={Theme.primary} />
              </View>
            </View>
          ) : null
        }
      />

      {/* Input Bar */}
      <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* Selected Attachment Preview Box */}
        {chat.selectedAttachment && (
          <AttachmentPreviewBar
            attachment={chat.selectedAttachment}
            onRemove={() => chat.setSelectedAttachment(null)}
          />
        )}

        <View style={s.inputWrapper}>
          <AttachmentButton onPress={chat.handlePickAttachmentOptions} />
          <TextInput
            style={s.input}
            value={chat.inputText}
            onChangeText={text => {
              chat.resetActivityTimer();
              chat.setInputText(text);
            }}
            placeholder={chat.selectedAttachment ? 'Add a comment (optional)...' : 'Type message or attach file'}
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={500}
          />
          <Pressable
            style={({ pressed }) => [
              s.sendBtn,
              (!chat.inputText.trim() && !chat.selectedAttachment) && s.sendBtnDisabled,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => chat.handleSend()}
            disabled={!chat.inputText.trim() && !chat.selectedAttachment}
          >
            <FontAwesome name="paper-plane" size={14} color="#fff" />
          </Pressable>
        </View>
        <Text style={s.poweredBy}>TOLA AI Support</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topBanner: {
    backgroundColor: '#e6d7b8',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  topBannerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBtn: { padding: 8 },
  closeCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#332914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentAvatarContainer: { alignItems: 'center', marginTop: 4 },
  avatarRing: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#ffffff',
    padding: 2,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 38 },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22c55e',
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  agentGreeting: {
    fontSize: 16,
    fontWeight: '700',
    color: '#332914',
    marginTop: 10,
  },
  agentSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b5830',
    marginTop: 2,
  },

  suggestionsContainer: {
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  suggestionsScroll: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: '#334155' },

  messageList: { padding: 16, gap: 14 },
  msgWrapper: { flexDirection: 'row', gap: 10, maxWidth: '85%' },
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
  msgBubbleBot: { backgroundColor: '#f1f5f9', borderBottomLeftRadius: 4 },

  inputBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 28,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 4,
    width: '100%',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    maxHeight: 90,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#cbd5e1' },
  poweredBy: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
    fontWeight: '500',
  },
});
