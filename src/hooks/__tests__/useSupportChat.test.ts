import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useSupportChat } from '@/src/hooks/useSupportChat';
import { apiGet, apiPost } from '@/src/services/api';
import { matchUserQuery } from '@/src/lib/supportAgent';

jest.mock('@/src/services/api');

jest.mock('@/src/lib/supportAgent', () => ({
  matchUserQuery: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

const mockedApiGet = apiGet as jest.Mock;
const mockedApiPost = apiPost as jest.Mock;
const mockedMatchUserQuery = matchUserQuery as jest.Mock;

describe('useSupportChat', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockedApiGet.mockReset();
    mockedApiPost.mockReset();
    mockedMatchUserQuery.mockReset();
  });

  afterEach(() => {
    alertSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('starts with just the welcome message and does not check tickets without an access token', async () => {
    const { result } = renderHook(() =>
      useSupportChat({ isAuthenticated: false, accessToken: null })
    );

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toBe('welcome-1');
    expect(mockedApiGet).not.toHaveBeenCalled();
  });

  it('picks up an existing open ticket and its conversation id on mount when authenticated', async () => {
    mockedApiGet.mockResolvedValue({
      tickets: [{ id: 'ticket-1', status: 'open', conversation_id: 'conv-1' }],
    });

    const { result } = renderHook(() =>
      useSupportChat({ isAuthenticated: true, accessToken: 'token-123' })
    );

    await waitFor(() => expect(result.current.activeTicket).not.toBeNull());

    expect(result.current.activeTicket).toEqual({ id: 'ticket-1', status: 'open', conversation_id: 'conv-1' });
    expect(result.current.liveConversationId).toBe('conv-1');
    expect(mockedApiGet).toHaveBeenCalledWith('/support/tickets', 'token-123');
  });

  it('sends a message to the AI endpoint and appends the bot reply', async () => {
    mockedApiPost.mockResolvedValueOnce({ response: 'Here is your answer', needs_human: false });

    const { result } = renderHook(() =>
      useSupportChat({ isAuthenticated: false, accessToken: undefined })
    );

    await act(async () => {
      await result.current.handleSend('How do I track my order?');
    });

    const texts = result.current.messages.map((m) => m.text);
    expect(texts).toContain('How do I track my order?');
    expect(texts).toContain('Here is your answer');
    expect(result.current.isTyping).toBe(false);
  });

  it('falls back to the local FAQ matcher when the AI endpoint fails', async () => {
    mockedApiPost.mockRejectedValueOnce(new Error('network down'));
    mockedMatchUserQuery.mockReturnValue({
      entry: { id: 'faq-1', answer: 'Try the FAQ answer instead.' },
      score: 5,
    });

    const { result } = renderHook(() =>
      useSupportChat({ isAuthenticated: false, accessToken: undefined })
    );

    await act(async () => {
      await result.current.handleSend('random question');
    });

    const texts = result.current.messages.map((m) => m.text);
    expect(texts).toContain('Try the FAQ answer instead.');
  });

  it('offers human escalation when the AI fails and no FAQ match is found', async () => {
    mockedApiPost.mockRejectedValueOnce(new Error('network down'));
    mockedMatchUserQuery.mockReturnValue(null);

    const { result } = renderHook(() =>
      useSupportChat({ isAuthenticated: false, accessToken: undefined })
    );

    await act(async () => {
      await result.current.handleSend('something obscure');
    });

    const lastMsg = result.current.messages[result.current.messages.length - 1];
    expect(lastMsg.showEscalationOption).toBe(true);
  });

  it('creates a support ticket and connects to live conversation on escalation', async () => {
    mockedApiPost.mockResolvedValueOnce({
      ticket: { id: 'ticket-abcdefgh', conversation_id: 'conv-99' },
    });

    const { result } = renderHook(() =>
      useSupportChat({ isAuthenticated: true, accessToken: 'token-123' })
    );

    await act(async () => {
      await result.current.handleEscalateToHuman();
    });

    expect(result.current.activeTicket).toMatchObject({ id: 'ticket-abcdefgh', conversation_id: 'conv-99' });
    expect(result.current.liveConversationId).toBe('conv-99');
    expect(result.current.isEscalating).toBe(false);
    const texts = result.current.messages.map((m) => m.text);
    expect(texts.some((t) => t.includes('Connected to Human Support'))).toBe(true);
  });

  it('prompts sign-in instead of escalating when the user is not authenticated', async () => {
    const { result } = renderHook(() =>
      useSupportChat({ isAuthenticated: false, accessToken: undefined })
    );

    await act(async () => {
      await result.current.handleEscalateToHuman();
    });

    expect(alertSpy).toHaveBeenCalledWith('Sign In Required', expect.any(String), expect.any(Array));
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('resets state and navigates back when the chat session is ended', () => {
    const { result } = renderHook(() =>
      useSupportChat({ isAuthenticated: false, accessToken: undefined })
    );

    act(() => {
      result.current.setInputText('draft message');
    });

    act(() => {
      result.current.handleEndChatSession('user');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toBe('welcome-1');
    expect(result.current.inputText).toBe('');
    expect(alertSpy).toHaveBeenCalled();

    // Simulate the user tapping "OK" on the alert.
    const okHandler = alertSpy.mock.calls[0][2][0].onPress;
    okHandler();
    expect(router.back).toHaveBeenCalled();
  });

  it('automatically sends the initialQuery param exactly once on mount', async () => {
    mockedApiPost.mockResolvedValue({ response: 'auto reply' });

    const { result } = renderHook(() =>
      useSupportChat({ isAuthenticated: false, accessToken: undefined, initialQuery: 'help me' })
    );

    await waitFor(() => {
      const texts = result.current.messages.map((m) => m.text);
      expect(texts).toContain('help me');
    });

    expect(mockedApiPost).toHaveBeenCalledTimes(1);
  });
});
