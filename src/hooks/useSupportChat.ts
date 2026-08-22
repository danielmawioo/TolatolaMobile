import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { apiGet, apiPost } from '@/src/services/api';
import { matchUserQuery } from '@/src/lib/supportAgent';
import { logger } from '@/src/lib/logger';

export const TERMINATION_COUNTDOWN_SEC = 120; // 2 minutes

export const INITIAL_WELCOME_MSG: Message = {
  id: 'welcome-1',
  sender: 'bot',
  text: "Welcome to Tola! I'm Moureen Tyler, your 24/7 digital agent to help you with whatever you may need! 😊 Type your question or attach a photo/PDF document.",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
};

export interface Message {
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

export interface SelectedAttachment {
  uri: string;
  name: string;
  mimeType: string;
  base64Data?: string;
  isPdf: boolean;
}

export interface SupportTicket {
  id: string;
  status?: string;
  conversation_id?: string | null;
  [key: string]: any;
}

interface UseSupportChatParams {
  isAuthenticated: boolean;
  accessToken: string | null | undefined;
  initialQuery?: string;
}

/**
 * Owns all chat state for the support screen: the message list, sending
 * messages to either the AI bot or an escalated live conversation,
 * checking for/polling an existing support ticket, the attachment picker,
 * and the (currently dormant) inactivity/session-termination countdown UI
 * state.
 */
export function useSupportChat({ isAuthenticated, accessToken, initialQuery }: UseSupportChatParams) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_WELCOME_MSG]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [liveConversationId, setLiveConversationId] = useState<string | null>(null);

  // Attachment State
  const [selectedAttachment, setSelectedAttachment] = useState<SelectedAttachment | null>(null);

  // Inactivity & Session Termination State
  const lastActivityRef = useRef<number>(Date.now());
  const [inactivityPromptActive, setInactivityPromptActive] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(TERMINATION_COUNTDOWN_SEC);

  const resetActivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setInactivityPromptActive((prev) => (prev ? false : prev));
  }, []);

  const scrollToBottomRef = useRef<() => void>(() => {});

  const checkExistingTickets = useCallback(async () => {
    try {
      const res = await apiGet<any>('/support/tickets', accessToken!);
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
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      checkExistingTickets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, accessToken]);

  // Poll for incoming messages from support agent during active live support
  useEffect(() => {
    if (!liveConversationId || !accessToken) return;
    const interval = setInterval(async () => {
      try {
        const res = await apiGet<any>(`/conversations/${liveConversationId}/messages`, accessToken);
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
  }, [liveConversationId, accessToken]);

  const handlePickAttachmentOptions = useCallback(() => {
    Alert.alert(
      'Attach File',
      'Choose attachment type for Moureen Tyler & Support Agent:',
      [
        { text: '📷 Choose Photo (Gallery)', onPress: pickImage },
        { text: '📄 Select PDF Document', onPress: pickDocument },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickImage = useCallback(async () => {
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
          base64Data: base64 ?? undefined,
          isPdf: false,
        });
      }
    } catch (err) {
      logger.error('Error picking image:', err);
    }
  }, []);

  const pickDocument = useCallback(async () => {
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
  }, []);

  const handleContinueChatSession = useCallback(() => {
    resetActivityTimer();
    const resMsg: Message = {
      id: `resumed-${Date.now()}`,
      sender: 'bot',
      text: 'Great! Your chat session has been resumed. How else can Moureen Tyler help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setMessages(prev => [...prev, resMsg]);
    scrollToBottomRef.current();
  }, [resetActivityTimer]);

  const handleEndChatSession = useCallback((reason: 'user' | 'inactivity' = 'user') => {
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
  }, []);

  const handleSend = useCallback(async (textToSend?: string) => {
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
    scrollToBottomRef.current();

    // If connected to live human support, send message to live conversation
    if (liveConversationId && accessToken) {
      try {
        await apiPost(
          `/conversations/${liveConversationId}/messages`,
          {
            message: userMsgText,
            attachment_url: currentAttachment?.uri,
            attachment_type: currentAttachment?.mimeType,
          },
          accessToken
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
        accessToken
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
      scrollToBottomRef.current();
    }
  }, [inputText, selectedAttachment, liveConversationId, accessToken, messages, resetActivityTimer]);

  const handleEscalateToHuman = useCallback(async () => {
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
        accessToken
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
      scrollToBottomRef.current();
    }
  }, [isAuthenticated, messages, accessToken, resetActivityTimer]);

  const hasSentInitialQueryRef = useRef(false);
  useEffect(() => {
    if (initialQuery && !hasSentInitialQueryRef.current) {
      hasSentInitialQueryRef.current = true;
      handleSend(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  return {
    messages,
    inputText,
    setInputText,
    isTyping,
    isEscalating,
    activeTicket,
    liveConversationId,
    selectedAttachment,
    setSelectedAttachment,
    inactivityPromptActive,
    secondsRemaining,
    resetActivityTimer,
    scrollToBottomRef,
    handlePickAttachmentOptions,
    handleContinueChatSession,
    handleEndChatSession,
    handleSend,
    handleEscalateToHuman,
  };
}
