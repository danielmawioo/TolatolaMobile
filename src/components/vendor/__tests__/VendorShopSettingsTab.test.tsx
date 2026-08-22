import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { VendorShopSettingsTab } from '@/src/components/vendor/VendorShopSettingsTab';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('VendorShopSettingsTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows a location warning when the shop has no address', () => {
    render(
      <VendorShopSettingsTab shop={{ name: 'Asha Shop' }} vendor={{ business_name: 'Asha Traders' }} onGoToProfile={jest.fn()} />
    );
    expect(screen.getByText('Asha Shop')).toBeTruthy();
    expect(screen.getByText(/accurate delivery fees/)).toBeTruthy();
  });

  it('shows the full address when present', () => {
    render(
      <VendorShopSettingsTab
        shop={{ name: 'Asha Shop', address: '123 Main St', region: 'Dar', district: 'Ilala' }}
        vendor={{}}
        onGoToProfile={jest.fn()}
      />
    );
    expect(screen.getByText('123 Main St')).toBeTruthy();
    expect(screen.queryByText(/accurate delivery fees/)).toBeNull();
  });

  it('navigates to shop edit and calls onGoToProfile from their respective buttons', () => {
    const onGoToProfile = jest.fn();
    render(<VendorShopSettingsTab shop={{}} vendor={{}} onGoToProfile={onGoToProfile} />);

    fireEvent.press(screen.getByText('Profile'));
    expect(onGoToProfile).toHaveBeenCalled();

    fireEvent.press(screen.getByText('Shop'));
    expect(router.push).toHaveBeenCalledWith('/(vendor)/shop/edit');
  });
});
