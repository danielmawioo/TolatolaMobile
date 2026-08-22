import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { VendorOverviewHeader } from '@/src/components/vendor/VendorOverviewHeader';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('VendorOverviewHeader', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows the create-shop prompt when there is no shop yet', () => {
    render(<VendorOverviewHeader vendorName="Asha" shop={null} products={[]} orders={[]} />);
    expect(screen.getByText('Welcome, Asha')).toBeTruthy();
    expect(screen.getByText('Create Your Shop')).toBeTruthy();

    fireEvent.press(screen.getByText('Create Shop'));
    expect(router.push).toHaveBeenCalledWith('/(vendor)/shop/create');
  });

  it('shows stats and a location warning when the shop has no region/district', () => {
    const shop = { id: 's1' };
    const orders = [{ status: 'pending' }, { status: 'delivered' }, { status: 'cancelled' }];
    render(<VendorOverviewHeader vendorName="Asha" shop={shop} products={[{ id: 'p1' }]} orders={orders} />);

    expect(screen.getByText('Products')).toBeTruthy();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0); // products count (and possibly others)
    expect(screen.getByText('3')).toBeTruthy(); // total orders count
    expect(screen.getByText('Shop Location Required')).toBeTruthy();

    fireEvent.press(screen.getByText('Add Location'));
    expect(router.push).toHaveBeenCalledWith('/(vendor)/shop/edit');
  });

  it('does not show the location warning once region and district are set', () => {
    const shop = { id: 's1', region: 'Dar es Salaam', district: 'Ilala' };
    render(<VendorOverviewHeader vendorName="Asha" shop={shop} products={[]} orders={[]} />);
    expect(screen.queryByText('Shop Location Required')).toBeNull();
  });
});
