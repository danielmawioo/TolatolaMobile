import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppThemeProvider, useAppTheme } from '@/src/contexts/ThemeContext';

const useColorScheme = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');

const THEME_STORAGE_KEY = '@tola_theme_mode';

describe('ThemeContext', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    useColorScheme.mockReturnValue('light');
  });

  it('defaults to light theme mode when nothing is stored', async () => {
    const { result } = renderHook(() => useAppTheme(), { wrapper: AppThemeProvider });

    expect(result.current.themeMode).toBe('light');
    expect(result.current.colorScheme).toBe('light');

    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY));
    expect(result.current.themeMode).toBe('light');
  });

  it('loads a previously saved theme mode from AsyncStorage on mount', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const { result } = renderHook(() => useAppTheme(), { wrapper: AppThemeProvider });

    await waitFor(() => expect(result.current.themeMode).toBe('dark'));
    expect(result.current.colorScheme).toBe('dark');
  });

  it('ignores an invalid persisted value and keeps the default', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'blue');

    const { result } = renderHook(() => useAppTheme(), { wrapper: AppThemeProvider });

    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY));
    expect(result.current.themeMode).toBe('light');
  });

  it('falls back to the system color scheme when mode is "system"', async () => {
    useColorScheme.mockReturnValue('dark');
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'system');

    const { result } = renderHook(() => useAppTheme(), { wrapper: AppThemeProvider });

    await waitFor(() => expect(result.current.themeMode).toBe('system'));
    expect(result.current.colorScheme).toBe('dark');
  });

  it('updates and persists the theme mode via setThemeMode', async () => {
    const { result } = renderHook(() => useAppTheme(), { wrapper: AppThemeProvider });

    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY));

    await act(async () => {
      await result.current.setThemeMode('dark');
    });

    expect(result.current.themeMode).toBe('dark');
    expect(result.current.colorScheme).toBe('dark');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
    await expect(AsyncStorage.getItem(THEME_STORAGE_KEY)).resolves.toBe('dark');
  });

  it('toggles between light and dark and persists each change', async () => {
    const { result } = renderHook(() => useAppTheme(), { wrapper: AppThemeProvider });

    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY));
    expect(result.current.colorScheme).toBe('light');

    await act(async () => {
      await result.current.toggleTheme();
    });
    expect(result.current.themeMode).toBe('dark');
    expect(result.current.colorScheme).toBe('dark');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(THEME_STORAGE_KEY, 'dark');

    await act(async () => {
      await result.current.toggleTheme();
    });
    expect(result.current.themeMode).toBe('light');
    expect(result.current.colorScheme).toBe('light');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(THEME_STORAGE_KEY, 'light');
  });

  it('returns the default context value when used outside of AppThemeProvider', () => {
    const { result } = renderHook(() => useAppTheme());

    expect(result.current.themeMode).toBe('system');
    expect(result.current.colorScheme).toBe('light');
  });
});
