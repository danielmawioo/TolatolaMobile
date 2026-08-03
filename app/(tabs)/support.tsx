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
  Image,
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

const AISHA_AVATAR = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80';
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const TERMINATION_COUNTDOWN_SEC = 120; // 2 minutes

const INITIAL_WELCOME_MSG: Message = {
  id: 'welcome-1',
  sender: 'bot',
  text: "Welcome to Tola! I'm Aisha, your 24/7 digital agent to help you with whatever you may need! 😊 Choose one of the following topics or type your question.",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
};

interface Message {
  id: string;
  sender: 'bot' | 'user' | 'agent';
  text: string;
  timestamp: string;
  showEscalationOption?: boolean;
  showInactivityPrompt?: boolean;
}

export default function SupportChatScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, session } = useAuth();
  const params = useLocalSearchParams<{ initialQuery?: string }>();

  const [messages, setMessages] = useState<Message[]>([INITIAL_WELCOME_MSG]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [liveConversationId, setLiveConversationId] = useState<string | null>(null);

  // Inactivity & Session Termination State
  const lastActivityRef = useRef<number>(Date.now());
  const [inactivityPromptActive, setInactivityPromptActive] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(TERMINATION_COUNTDOWN_SEC);

  const flatListRef = useRef<FlatList>(null);

  const resetActivityTimer = () => {
    lastActivityRef.current = Date.now();
    if (inactivityPromptActive) {
      setInactivityPromptActive(false);
    }
  };

  useEffect(() => {
    if (params.initialQuery) {
      handleSend(params.initialQuery);
    }
  }, [params.initialQuery]);

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
          setLiveConversationId(openTicket.conversation_id);
        }
      }
    } catch (e) {
      console.log('Error checking tickets:', e);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleContinueChatSession = () => {
    resetActivityTimer();
    const resMsg: Message = {
      id: `resumed-${Date.now()}`,
      sender: 'bot',
      text: 'Great! Your chat session has been resumed. How else can Aisha help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setMessages(prev => [...prev, resMsg]);
    scrollToBottom();
  };

  const handleEndChatSession = (reason: 'user' | 'inactivity' = 'user') => {
    setInactivityPromptActive(false);
    setActiveTicket(null);
    setLiveConversationId(null);
    setMessages([INITIAL_WELCOME_MSG]);
    setInputText('');

    Alert.alert(
      reason === 'inactivity' ? 'Session Ended' : 'Chat Ended',
      'Your chat session has been terminated due to inactivity. You can start a new session anytime.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    resetActivityTimer();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    scrollToBottom();

    // If connected to live human support, send message to live conversation
    if (liveConversationId && session?.access_token) {
      try {
        await apiPost(
          `/conversations/${liveConversationId}/messages`,
          { message: text },
          session.access_token
        );
      } catch (e) {
        console.log('Error sending message to live conversation:', e);
      }
      return;
    }

    setIsTyping(true);

    try {
      const chatHistory = messages.map(m => ({ sender: m.sender, text: m.text }));
      const res = await apiPost<any>(
        '/support/ai-chat',
        { message: text, history: chatHistory },
        session?.access_token
      );

      if (res?.response) {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: res.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          showEscalationOption: res.needs_human,
        };
        setMessages(prev => [...prev, botMsg]);

        if (res.ticket) {
          setActiveTicket(res.ticket);
          const convId = res.conversation?.id || res.ticket.conversation_id;
          if (convId) setLiveConversationId(convId);
        }
      } else {
        throw new Error('No AI response');
      }
    } catch (err) {
      const matchResult = matchUserQuery(text);
      if (matchResult) {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: matchResult.entry.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: `I'm sorry, I couldn't find an exact match for your question. Would you like to connect with our human Customer Support team?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          showEscalationOption: true,
        };
        setMessages(prev => [...prev, botMsg]);
      }
    } finally {
      setIsTyping(false);
      resetActivityTimer();
      scrollToBottom();
    }
  };

  const handleEscalateToHuman = async () => {
    resetActivityTimer();
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to connect with live human customer support.', [
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
        { subject, message: messageBody, priority: 'medium' },
        session?.access_token
      );

      if (res?.ticket) {
        const convId = res.conversation?.id || res.ticket.conversation_id;
        setActiveTicket({ ...res.ticket, conversation_id: convId });
        if (convId) setLiveConversationId(convId);

        const botMsg: Message = {
          id: Date.now().toString(),
          sender: 'bot',
          text: `✅ Connected to Human Support!\n\nTicket #${res.ticket.id.slice(0, 8)} created. A support representative will review your messages and reply shortly. Your messages will now be sent directly to our support team.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        setMessages(prev => [...prev, botMsg]);
      }
    } catch (e: any) {
      Alert.alert('Connection Failed', e.message || 'Failed to create support ticket');
    } finally {
      setIsEscalating(false);
      resetActivityTimer();
      scrollToBottom();
    }
  };

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

        {/* Centered Aisha Avatar Header */}
        <View style={s.agentAvatarContainer}>
          <View style={s.avatarRing}>
            <Image source={{ uri: AISHA_AVATAR }} style={s.avatarImage} />
            <View style={s.onlineBadge} />
          </View>
          <Text style={s.agentGreeting}>Hello, I'm Aisha</Text>
          <Text style={s.agentSubtitle}>TOLA Digital Agent</Text>
        </View>
      </View>

      {/* Suggestion Chips */}
      {messages.length <= 3 && (
        <View style={s.suggestionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.suggestionsScroll}>
            {QUICK_SUGGESTIONS.map((q, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]}
                onPress={() => handleSend(q)}
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
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={s.messageList}
        renderItem={({ item }) => {
          const isUser = item.sender === 'user';
          return (
            <View style={[s.msgWrapper, isUser ? s.msgWrapperUser : s.msgWrapperBot]}>
              {!isUser && (
                <Image source={{ uri: AISHA_AVATAR }} style={s.msgAvatar} />
              )}
              <View style={[s.msgBubble, isUser ? s.msgBubbleUser : s.msgBubbleBot]}>
                <Text style={[s.msgText, isUser ? s.msgTextUser : s.msgTextBot]}>{item.text}</Text>
                <Text style={[s.msgTime, isUser ? s.msgTimeUser : s.msgTimeBot]}>{item.timestamp}</Text>

                {/* Human Escalation Option */}
                {item.showEscalationOption && !activeTicket && (
                  <Pressable
                    style={({ pressed }) => [s.escalateBtn, pressed && { opacity: 0.85 }]}
                    onPress={handleEscalateToHuman}
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
                {item.showInactivityPrompt && inactivityPromptActive && (
                  <View style={s.inactivityPromptContainer}>
                    <Text style={s.inactivityTimerText}>
                      Ending automatically in {Math.floor(secondsRemaining / 60)}m {secondsRemaining % 60}s...
                    </Text>
                    <View style={s.inactivityBtnRow}>
                      <Pressable style={s.continueBtn} onPress={handleContinueChatSession}>
                        <FontAwesome name="refresh" size={12} color="#fff" />
                        <Text style={s.continueBtnText}>Continue</Text>
                      </Pressable>
                      <Pressable style={s.endBtn} onPress={() => handleEndChatSession('user')}>
                        <FontAwesome name="sign-out" size={12} color="#dc2626" />
                        <Text style={s.endBtnText}>End Chat</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          isTyping ? (
            <View style={[s.msgWrapper, s.msgWrapperBot]}>
              <Image source={{ uri: AISHA_AVATAR }} style={s.msgAvatar} />
              <View style={[s.msgBubble, s.msgBubbleBot, { paddingVertical: 12, paddingHorizontal: 16 }]}>
                <ActivityIndicator size="small" color={Theme.primary} />
              </View>
            </View>
          ) : null
        }
      />

      {/* Input Bar */}
      <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={s.inputWrapper}>
          <TextInput
            style={s.input}
            value={inputText}
            onChangeText={text => {
              resetActivityTimer();
              setInputText(text);
            }}
            placeholder="Type your message"
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={500}
          />
          <Pressable
            style={({ pressed }) => [s.sendBtn, !inputText.trim() && s.sendBtnDisabled, pressed && { opacity: 0.8 }]}
            onPress={() => handleSend()}
            disabled={!inputText.trim()}
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
    paddingLeft: 16,
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
    backgroundColor: '#94a3b8',
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
