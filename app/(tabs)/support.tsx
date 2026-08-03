import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { apiGet, apiPost } from '@/src/services/api';
import { matchUserQuery } from '@/src/lib/supportAgent';
import { QUICK_SUGGESTIONS } from '@/src/data/supportFAQ';

interface Message {
  id: string;
  sender: 'bot' | 'user' | 'agent';
  text: string;
  timestamp: string;
  showEscalationOption?: boolean;
}

export default function SupportChatScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, session } = useAuth();
  const params = useLocalSearchParams<{ initialQuery?: string }>();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: 'Hello! 👋 I am your TOLATOLA Support Assistant. How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [liveMessages, setLiveMessages] = useState<any[]>([]);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (params.initialQuery) {
      handleSend(params.initialQuery);
    }
  }, [params.initialQuery]);

  // Load existing open tickets if logged in
  useEffect(() => {
    if (isAuthenticated && session?.access_token) {
      checkExistingTickets();
    }
  }, [isAuthenticated, session?.access_token]);

  const checkExistingTickets = async () => {
    try {
      const res = await apiGet<any>('/support/tickets', session!.access_token);
      const tickets = Array.isArray(res) ? res : res?.tickets || [];
      const openTicket = tickets.find((t: any) => t.status === 'open' || t.status === 'in_progress');
      if (openTicket) {
        setActiveTicket(openTicket);
        if (openTicket.conversation_id) {
          fetchLiveMessages(openTicket.conversation_id);
        }
      }
    } catch (e) {
      console.log('Error checking existing tickets:', e);
    }
  };

  const fetchLiveMessages = async (convId: string) => {
    try {
      const res = await apiGet<any>(`/conversations/${convId}/messages`, session?.access_token);
      const msgs = Array.isArray(res) ? res : res?.messages || [];
      setLiveMessages(msgs);
    } catch (e) {
      console.log('Error fetching live messages:', e);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    scrollToBottom();

    // If actively in a live support conversation with human agent
    if (activeTicket && activeTicket.conversation_id) {
      sendLiveMessage(text);
      return;
    }

    // AI Bot response logic
    setIsTyping(true);
    setTimeout(() => {
      const matchResult = matchUserQuery(text);

      if (matchResult) {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: matchResult.entry.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: `I'm sorry, I couldn't find an exact match for your question. Would you like to connect with a human Customer Support agent?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          showEscalationOption: true,
        };
        setMessages(prev => [...prev, botMsg]);
      }
      setIsTyping(false);
      scrollToBottom();
    }, 600);
  };

  const sendLiveMessage = async (text: string) => {
    if (!activeTicket?.conversation_id) return;
    try {
      await apiPost(
        `/conversations/${activeTicket.conversation_id}/messages`,
        { message: text },
        session?.access_token
      );
      fetchLiveMessages(activeTicket.conversation_id);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send message');
    }
  };

  const handleEscalateToHuman = async () => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to open a live chat with customer support.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/(auth)/sign-in' as any) },
      ]);
      return;
    }

    setIsEscalating(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
      const subject = lastUserMsg ? lastUserMsg.text.slice(0, 45) : 'General Inquiry';
      const messageBody = messages.map(m => `${m.sender.toUpperCase()}: ${m.text}`).join('\n');

      const res = await apiPost<any>(
        '/support/tickets',
        {
          subject,
          message: messageBody,
          priority: 'medium',
        },
        session?.access_token
      );

      if (res?.ticket) {
        setActiveTicket(res.ticket);
        const botMsg: Message = {
          id: Date.now().toString(),
          sender: 'bot',
          text: `✅ Connected! Support Ticket #${res.ticket.id.slice(0, 8)} created. A customer support representative will respond shortly. You can send additional details here.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, botMsg]);
        if (res.conversation?.id) {
          fetchLiveMessages(res.conversation.id);
        }
      }
    } catch (e: any) {
      Alert.alert('Connection Failed', e.message || 'Failed to connect to human support.');
    } finally {
      setIsEscalating(false);
      scrollToBottom();
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={10}>
          <FontAwesome name="arrow-left" size={18} color="#fff" />
        </Pressable>
        <View style={s.headerCenter}>
          <View style={s.avatarBox}>
            <FontAwesome name="headphones" size={16} color={Theme.primary} />
          </View>
          <View>
            <Text style={s.headerTitle}>TOLA Support Agent</Text>
            <View style={s.statusRow}>
              <View style={s.statusDot} />
              <Text style={s.statusText}>{activeTicket ? 'Live Support Connected' : 'AI Assistant Online'}</Text>
            </View>
          </View>
        </View>
        {activeTicket && (
          <View style={s.ticketBadge}>
            <Text style={s.ticketBadgeText}>#{activeTicket.id.slice(0, 6)}</Text>
          </View>
        )}
      </View>

      {/* Suggestion Chips */}
      {!activeTicket && messages.length <= 3 && (
        <View style={s.suggestionsContainer}>
          <Text style={s.suggestionsLabel}>Frequently Asked Questions:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.suggestionsScroll}>
            {QUICK_SUGGESTIONS.map((q, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]}
                onPress={() => handleSend(q)}
              >
                <FontAwesome name="question-circle-o" size={12} color={Theme.primary} />
                <Text style={s.chipText}>{q}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={s.messageList}
        renderItem={({ item }) => {
          const isUser = item.sender === 'user';
          return (
            <View style={[s.msgWrapper, isUser ? s.msgWrapperUser : s.msgWrapperBot]}>
              {!isUser && (
                <View style={s.botAvatar}>
                  <FontAwesome name="android" size={12} color="#fff" />
                </View>
              )}
              <View style={[s.msgBubble, isUser ? s.msgBubbleUser : s.msgBubbleBot]}>
                <Text style={[s.msgText, isUser ? s.msgTextUser : s.msgTextBot]}>{item.text}</Text>
                <Text style={[s.msgTime, isUser ? s.msgTimeUser : s.msgTimeBot]}>{item.timestamp}</Text>

                {item.showEscalationOption && !activeTicket && (
                  <Pressable
                    style={({ pressed }) => [s.escalateBtn, pressed && { opacity: 0.8 }]}
                    onPress={handleEscalateToHuman}
                    disabled={isEscalating}
                  >
                    {isEscalating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <FontAwesome name="user" size={13} color="#fff" />
                        <Text style={s.escalateBtnText}>Connect to Human Support</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          isTyping ? (
            <View style={[s.msgWrapper, s.msgWrapperBot]}>
              <View style={s.botAvatar}>
                <FontAwesome name="android" size={12} color="#fff" />
              </View>
              <View style={[s.msgBubble, s.msgBubbleBot, { paddingVertical: 10, paddingHorizontal: 16 }]}>
                <ActivityIndicator size="small" color={Theme.primary} />
              </View>
            </View>
          ) : null
        }
      />

      {/* Input Bar */}
      <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          style={s.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask a question or describe an issue..."
          placeholderTextColor={Theme.textMuted}
          multiline
          maxLength={500}
        />
        <Pressable
          style={({ pressed }) => [s.sendBtn, !inputText.trim() && s.sendBtnDisabled, pressed && { opacity: 0.8 }]}
          onPress={() => handleSend()}
          disabled={!inputText.trim()}
        >
          <FontAwesome name="paper-plane" size={15} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  header: {
    backgroundColor: Theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,

  },
  backBtn: { padding: 6 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
  statusText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '500' },
  ticketBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ticketBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  suggestionsContainer: {
    backgroundColor: Theme.background,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
  },
  suggestionsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.textMuted,
    paddingHorizontal: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  suggestionsScroll: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.backgroundSecondary,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: Theme.textSecondary },

  messageList: { padding: 16, gap: 12 },
  msgWrapper: { flexDirection: 'row', gap: 8, maxWidth: '85%' },
  msgWrapperUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgWrapperBot: { alignSelf: 'flex-start' },
  botAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  msgBubble: { borderRadius: 16, padding: 12, gap: 4 },
  msgBubbleUser: { backgroundColor: Theme.primary, borderBottomRightRadius: 4 },
  msgBubbleBot: { backgroundColor: Theme.background, borderWidth: 1, borderColor: Theme.inputBorder, borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextUser: { color: '#fff' },
  msgTextBot: { color: Theme.text },
  msgTime: { fontSize: 10, alignSelf: 'flex-end' },
  msgTimeUser: { color: 'rgba(255,255,255,0.7)' },
  msgTimeBot: { color: Theme.textMuted },

  escalateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  escalateBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.background,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Theme.inputBorder,
  },
  input: {
    flex: 1,
    backgroundColor: Theme.inputBg,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Theme.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Theme.textMuted, opacity: 0.5 },
});
