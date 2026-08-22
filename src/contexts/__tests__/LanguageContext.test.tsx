import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageProvider, useLanguage } from '@/src/contexts/LanguageContext';

const LANGUAGE_KEY = '@tolatola/language';

describe('LanguageContext', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('defaults to English when nothing is stored', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper: LanguageProvider });

    expect(result.current.language).toBe('en');

    // Let the initial AsyncStorage read resolve; value should remain default.
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(LANGUAGE_KEY));
    expect(result.current.language).toBe('en');
    expect(result.current.pick('hello', 'habari')).toBe('hello');
  });

  it('loads a previously saved language from AsyncStorage on mount', async () => {
    await AsyncStorage.setItem(LANGUAGE_KEY, 'sw');

    const { result } = renderHook(() => useLanguage(), { wrapper: LanguageProvider });

    await waitFor(() => expect(result.current.language).toBe('sw'));
    expect(result.current.pick('hello', 'habari')).toBe('habari');
  });

  it('ignores an invalid persisted value and keeps the default', async () => {
    await AsyncStorage.setItem(LANGUAGE_KEY, 'fr');

    const { result } = renderHook(() => useLanguage(), { wrapper: LanguageProvider });

    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(LANGUAGE_KEY));
    expect(result.current.language).toBe('en');
  });

  it('updates and persists the language via setLanguage', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper: LanguageProvider });

    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(LANGUAGE_KEY));

    await act(async () => {
      await result.current.setLanguage('sw');
    });

    expect(result.current.language).toBe('sw');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(LANGUAGE_KEY, 'sw');
    await expect(AsyncStorage.getItem(LANGUAGE_KEY)).resolves.toBe('sw');
  });

  it('toggles between en and sw and persists each change', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper: LanguageProvider });

    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(LANGUAGE_KEY));
    expect(result.current.language).toBe('en');

    await act(async () => {
      await result.current.toggleLanguage();
    });
    expect(result.current.language).toBe('sw');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(LANGUAGE_KEY, 'sw');

    await act(async () => {
      await result.current.toggleLanguage();
    });
    expect(result.current.language).toBe('en');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(LANGUAGE_KEY, 'en');
  });

  it('throws when useLanguage is used outside of LanguageProvider', () => {
    expect(() => renderHook(() => useLanguage())).toThrow(
      'useLanguage must be used within LanguageProvider'
    );
  });
});
