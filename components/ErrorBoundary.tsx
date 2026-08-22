import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';
import { logger } from '@/src/lib/logger';
import { captureException } from '@/src/lib/errorTracking';

interface Props {
  children: ReactNode;
  /** Optional fallback UI (otherwise uses default message + "Try again") */
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render errors and shows a friendly fallback instead of a red box.
 * Wrap the root of your app (or each stack) so one broken screen doesn't crash the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) {
      logger.error('ErrorBoundary caught:', error, errorInfo.componentStack);
    }
    // Unlike the console log above, this always runs — including in production
    // builds, where render crashes were previously silent.
    captureException(error, { componentStack: errorInfo.componentStack });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError && this.props.fallback) {
      return this.props.fallback;
    }
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            We're sorry. Please try again or go back to home.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }]}
            onPress={this.handleRetry}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: gap.lg,
    backgroundColor: Theme.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: Theme.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: Theme.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: Theme.radiusMd,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
