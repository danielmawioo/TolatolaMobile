import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProductSection } from '@/src/components/home/ProductSection';
import type { useThemeColors } from '@/src/hooks/useThemeColors';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

const baseTheme = {
  isDark: false,
  primary: '#e11d2b',
  text: '#0f172a',
  textSecondary: '#475569',
} as unknown as ReturnType<typeof useThemeColors>;

const products = [
  { id: 'p1', name: 'Rice 25kg', price: 40000 },
  { id: 'p2', name: 'Cooking Oil', price: 15000 },
] as any;

describe('ProductSection', () => {
  it('renders nothing when there are no products', () => {
    const { toJSON } = render(
      <ProductSection
        theme={baseTheme}
        titleMain="Handpicked for "
        titleItalic="You"
        italicColor="#e11d2b"
        products={[]}
        badge={{ text: 'NEW', variant: 'new' }}
        likedIds={new Set()}
        cartItems={[]}
        onAddToCart={jest.fn()}
        onToggleLike={jest.fn()}
      />
    );

    expect(toJSON()).toBeNull();
  });

  it('renders the title, subtitle and one card per product when products exist', () => {
    render(
      <ProductSection
        theme={baseTheme}
        subtitle="Sourced from preferred partners"
        titleMain="Supply Chain "
        titleItalic="Matches"
        italicColor="#e11d2b"
        products={products}
        badge={{ text: 'MATCHED', variant: 'new' }}
        likedIds={new Set(['p1'])}
        cartItems={[]}
        onAddToCart={jest.fn()}
        onToggleLike={jest.fn()}
      />
    );

    expect(screen.getByText('Sourced from preferred partners')).toBeTruthy();
    expect(screen.getByText(/Supply Chain/)).toBeTruthy();
    expect(screen.getByText('Rice 25kg')).toBeTruthy();
    expect(screen.getByText('Cooking Oil')).toBeTruthy();
    expect(screen.getByText('See All')).toBeTruthy();
  });
});
