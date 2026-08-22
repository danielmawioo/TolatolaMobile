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
  Linking,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Theme } from '@/constants/Theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { apiGet, apiPost } from '@/src/services/api';
import { matchUserQuery } from '@/src/lib/supportAgent';
import { QUICK_SUGGESTIONS } from '@/src/data/supportFAQ';
import { logger } from '@/src/lib/logger';

const MOUREEN_AVATAR = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80';
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const TERMINATION_COUNTDOWN_SEC = 120; // 2 minutes

const INITIAL_WELCOME_MSG: Message = {
  id: 'welcome-1',
  sender: 'bot',
  text: "Welcome to Tola! I'm Moureen Tyler, your 24/7 digital agent to help you with whatever you may need! 😊 Type your question or attach a photo/PDF document.",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
};

interface Message {
  id: string;
  sender: 'bot' | 'user' | 'agent';
  text: string;
  timestamp: string;
  showEscalationOption?: boolean;
  showInactivityPrompt?: boolean;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentName?: string;
}

interface SelectedAttachment {
  uri: string;
  name: string;
  mimeType: string;
  base64Data?: string;
  isPdf: boolean;
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

  // Attachment State
  const [selectedAttachment, setSelectedAttachment] = useState<SelectedAttachment | null>(null);

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

  // Poll for incoming messages from support agent during active live support
  useEffect(() => {
    if (!liveConversationId || !session?.access_token) return;
    const interval = setInterval(async () => {
      try {
        const res = await apiGet<any>(`/conversations/${liveConversationId}/messages`, session.access_token);
        const msgs = res?.data || res?.messages || (Array.isArray(res) ? res : []);
        if (Array.isArray(msgs) && msgs.length > 0) {
          setMessages((prev) => {
            let updated = [...prev];
            let changed = false;
            for (const m of msgs) {
              const msgId = `live-${m.id}`;
              if (!updated.some((existing) => existing.id === msgId || existing.id === m.id)) {
                changed = true;
                updated.push({
                  id: msgId,
                  sender: m.sender_type === 'bot' ? 'bot' : m.sender_type === 'agent' ? 'agent' : 'user',
                  text: m.message || '[Attachment]',
                  timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  attachmentUrl: m.attachment_url,
                  attachmentType: m.attachment_type,
                });
              }
            }
            return changed ? updated : prev;
          });
        }
      } catch (e) {
        /* silent */
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [liveConversationId, session?.access_token]);

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
      logger.info('Error checking tickets:', e);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handlePickAttachmentOptions = () => {
    Alert.alert(
      'Attach File',
      'Choose attachment type for Moureen Tyler & Support Agent:',
      [
        { text: '📷 Choose Photo (Gallery)', onPress: pickImage },
        { text: '📄 Select PDF Document', onPress: pickDocument },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow access to your photo library to attach pictures.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let base64 = asset.base64;
        if (!base64 && asset.uri) {
          try {
            base64 = await fetch(asset.uri).then(r => r.blob()).then(b => new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                const res = reader.result as string;
                resolve(res.includes(';base64,') ? res.split(';base64,')[1] : res);
              };
              reader.readAsDataURL(b);
            }));
          } catch (e) {
            logger.warn('Error reading image base64:', e);
          }
        }

        setSelectedAttachment({
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
          base64Data: base64,
          isPdf: false,
        });
      }
    } catch (err) {
      logger.error('Error picking image:', err);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let base64: string | undefined;
        try {
          base64 = await fetch(asset.uri).then(r => r.blob()).then(b => new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const res = reader.result as string;
              resolve(res.includes(';base64,') ? res.split(';base64,')[1] : res);
            };
            reader.readAsDataURL(b);
          }));
        } catch (e) {
          logger.warn('Error reading PDF base64:', e);
        }

        setSelectedAttachment({
          uri: asset.uri,
          name: asset.name || `document_${Date.now()}.pdf`,
          mimeType: asset.mimeType || 'application/pdf',
          base64Data: base64,
          isPdf: true,
        });
      }
    } catch (err) {
      logger.error('Error picking document:', err);
    }
  };

  const handleContinueChatSession = () => {
    resetActivityTimer();
    const resMsg: Message = {
      id: `resumed-${Date.now()}`,
      sender: 'bot',
      text: 'Great! Your chat session has been resumed. How else can Moureen Tyler help you today?',
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
    setSelectedAttachment(null);

    Alert.alert(
      reason === 'inactivity' ? 'Session Ended' : 'Chat Ended',
      'Your chat session has been terminated due to inactivity. You can start a new session anytime.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text && !selectedAttachment) return;

    resetActivityTimer();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsgText = text || (selectedAttachment ? `Attached document: ${selectedAttachment.name}` : '');
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      attachmentUrl: selectedAttachment?.uri,
      attachmentType: selectedAttachment?.mimeType,
      attachmentName: selectedAttachment?.name,
    };

    const currentAttachment = selectedAttachment;
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setSelectedAttachment(null);
    scrollToBottom();

    // If connected to live human support, send message to live conversation
    if (liveConversationId && session?.access_token) {
      try {
        await apiPost(
          `/conversations/${liveConversationId}/messages`,
          {
            message: userMsgText,
            attachment_url: currentAttachment?.uri,
            attachment_type: currentAttachment?.mimeType,
          },
          session.access_token
        );
      } catch (e) {
        logger.info('Error sending message to live conversation:', e);
      }
      return;
    }

    setIsTyping(true);

    try {
      const chatHistory = messages.map(m => ({
        sender: m.sender,
        text: m.text,
        attachmentUrl: m.attachmentUrl,
        attachmentType: m.attachmentType,
      }));

      const payload: any = {
        message: userMsgText,
        history: chatHistory,
        attachmentUrl: currentAttachment?.uri,
        attachmentType: currentAttachment?.mimeType,
      };

      if (currentAttachment) {
        payload.attachment = {
          data: currentAttachment.base64Data,
          mimeType: currentAttachment.mimeType,
          filename: currentAttachment.name,
          url: currentAttachment.uri,
        };
      }

      const res = await apiPost<any>(
        '/support/ai-chat',
        payload,
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
      const matchResult = matchUserQuery(userMsgText);
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
          text: `I couldn't process that attachment or message. Would you like to connect with our human Customer Support team?`,
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
        {
          subject,
          message: messageBody,
          priority: 'medium',
          history: messages.map(m => ({
            sender: m.sender,
            text: m.text,
            attachmentUrl: m.attachmentUrl,
            attachmentType: m.attachmentType,
          })),
        },
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
          const isImage = item.attachmentType?.startsWith('image/') || item.attachmentUrl?.startsWith('data:image/');
          return (
            <View style={[s.msgWrapper, isUser ? s.msgWrapperUser : s.msgWrapperBot]}>
              {!isUser && (
                <Image source={{ uri: MOUREEN_AVATAR }} style={s.msgAvatar} />
              )}
              <View style={[s.msgBubble, isUser ? s.msgBubbleUser : s.msgBubbleBot]}>
                
                {/* Message Attachment Rendering */}
                {item.attachmentUrl && (
                  <View style={s.attachmentContainer}>
                    {isImage ? (
                      <Image source={{ uri: item.attachmentUrl }} style={s.msgImageAttachment} resizeMode="cover" />
                    ) : (
                      <Pressable
                        style={s.pdfCard}
                        onPress={() => Linking.openURL(item.attachmentUrl!)}
                      >
                        <View style={s.pdfIconBadge}>
                          <FontAwesome name="file-pdf-o" size={18} color="#dc2626" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.pdfNameText} numberOfLines={1}>
                            {item.attachmentName || 'PDF Document'}
                          </Text>
                          <Text style={s.pdfSubText}>Tap to open PDF</Text>
                        </View>
                        <FontAwesome name="external-link" size={12} color="#94a3b8" />
                      </Pressable>
                    )}
                  </View>
                )}

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
        {selectedAttachment && (
          <View style={s.previewBar}>
            <View style={s.previewInfo}>
              {selectedAttachment.isPdf ? (
                <View style={s.previewPdfBadge}>
                  <Text style={s.previewPdfBadgeText}>PDF</Text>
                </View>
              ) : (
                <Image source={{ uri: selectedAttachment.uri }} style={s.previewImage} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.previewFileName} numberOfLines={1}>{selectedAttachment.name}</Text>
                <Text style={s.previewSubText}>{selectedAttachment.isPdf ? 'PDF Document' : 'Picture'}</Text>
              </View>
            </View>
            <Pressable style={s.removeAttachmentBtn} onPress={() => setSelectedAttachment(null)}>
              <FontAwesome name="times" size={12} color="#475569" />
            </Pressable>
          </View>
        )}

        <View style={s.inputWrapper}>
          <Pressable style={s.attachBtn} onPress={handlePickAttachmentOptions}>
            <FontAwesome name="paperclip" size={18} color="#64748b" />
          </Pressable>
          <TextInput
            style={s.input}
            value={inputText}
            onChangeText={text => {
              resetActivityTimer();
              setInputText(text);
            }}
            placeholder={selectedAttachment ? 'Add a comment (optional)...' : 'Type message or attach file'}
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={500}
          />
          <Pressable
            style={({ pressed }) => [
              s.sendBtn,
              (!inputText.trim() && !selectedAttachment) && s.sendBtnDisabled,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() && !selectedAttachment}
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

  inputBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  previewImage: { width: 36, height: 36, borderRadius: 8 },
  previewPdfBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPdfBadgeText: { fontSize: 10, fontWeight: '900', color: '#dc2626' },
  previewFileName: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  previewSubText: { fontSize: 10, color: '#64748b' },
  removeAttachmentBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
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
  attachBtn: {
    padding: 6,
    marginRight: 4,
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
