import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { captureException } from '@/src/lib/errorTracking';

jest.mock('@/src/lib/errorTracking', () => ({
  captureException: jest.fn(),
}));

function Bomb(): React.ReactElement {
  throw new Error('kaboom');
}

describe('ErrorBoundary', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <Text>All good</Text>
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeTruthy();
  });

  it('renders the fallback UI and reports to error tracking when a child throws', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );

    consoleError.mockRestore();
  });

  it('renders a custom fallback when provided', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<Text>Custom fallback</Text>}>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom fallback')).toBeTruthy();
  });

  it('calls onReset and clears the error state when "Try again" is pressed', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const onReset = jest.fn();

    render(
      <ErrorBoundary onReset={onReset}>
        <Bomb />
      </ErrorBoundary>
    );

    fireEvent.press(screen.getByText('Try again'));
    expect(onReset).toHaveBeenCalled();
  });
});
