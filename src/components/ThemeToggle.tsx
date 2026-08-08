import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAppTheme } from '@/src/contexts/ThemeContext';

export function ThemeToggle({ style }: { style?: any }) {
  const { colorScheme, toggleTheme } = useAppTheme();
  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={toggleTheme}
      style={[
        styles.button,
        isDark ? styles.buttonDark : styles.buttonLight,
        style,
      ]}
    >
      <FontAwesome
        name={isDark ? 'sun-o' : 'moon-o'}
        size={16}
        color={isDark ? '#FBBF24' : '#0F766E'}
      />
      <Text style={[styles.text, isDark ? styles.textDark : styles.textLight]}>
        {isDark ? 'Light Mode' : 'Dark Mode'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    alignSelf: 'center',
  },
  buttonLight: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0F766E44',
  },
  buttonDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
  textLight: {
    color: '#0F766E',
  },
  textDark: {
    color: '#F8FAFC',
  },
});
