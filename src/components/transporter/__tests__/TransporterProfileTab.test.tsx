import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { TransporterProfileTab } from '@/src/components/transporter/TransporterProfileTab';
import { apiPatch, apiPost } from '@/src/services/api';

jest.mock('@/src/services/api');

const mockedApiPatch = apiPatch as jest.Mock;
const mockedApiPost = apiPost as jest.Mock;

const profileData = {
  full_name: 'Juma Driver',
  email: 'juma@example.com',
  phone: '0754000000',
  address: 'Dar es Salaam',
  business_name: 'Fast Wheels',
  vehicle_type: 'car',
  license_plate: 'T 123 ABC',
  profile_image_url: '',
};

function baseProps(overrides: Partial<Parameters<typeof TransporterProfileTab>[0]> = {}) {
  return {
    transporter: { id: 't1', kyc_status: 'approved' },
    profileData,
    setProfileData: jest.fn(),
    session: { access_token: 'tok', user: { id: 'u1' } } as any,
    setSession: jest.fn().mockResolvedValue(undefined),
    loading: false,
    setLoading: jest.fn(),
    refreshing: false,
    onRefresh: jest.fn(),
    onTransporterUpdated: jest.fn(),
    onCancelEdit: jest.fn(),
    ...overrides,
  };
}

describe('TransporterProfileTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders read-only fields and an "Approved" KYC badge', () => {
    render(<TransporterProfileTab {...baseProps()} />);
    expect(screen.getByDisplayValue('Juma Driver')).toBeTruthy();
    expect(screen.getByText('Approved')).toBeTruthy();
    expect(screen.getByText('Verified Transporter')).toBeTruthy();
  });

  it('shows "Pending" by default when kyc_status is missing', () => {
    render(<TransporterProfileTab {...baseProps({ transporter: { id: 't1' } })} />);
    expect(screen.getByText('Pending')).toBeTruthy();
  });

  it('enters edit mode and saves both profile and transporter updates', async () => {
    mockedApiPatch.mockResolvedValueOnce({ profile: { full_name: 'Juma Driver' } });
    mockedApiPost.mockResolvedValueOnce({ transporter: { id: 't1' } });
    const onTransporterUpdated = jest.fn();

    render(<TransporterProfileTab {...baseProps({ onTransporterUpdated })} />);

    fireEvent.press(screen.getByText('Edit Profile'));
    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => expect(onTransporterUpdated).toHaveBeenCalledWith({ id: 't1' }));
    expect(mockedApiPatch).toHaveBeenCalledWith(
      '/profile',
      { full_name: 'Juma Driver', phone: '0754000000' },
      'tok'
    );
  });

  it('calls onCancelEdit when cancel is pressed while editing', () => {
    const onCancelEdit = jest.fn();
    render(<TransporterProfileTab {...baseProps({ onCancelEdit })} />);
    fireEvent.press(screen.getByText('Edit Profile'));
    fireEvent.press(screen.getByText('Cancel'));
    expect(onCancelEdit).toHaveBeenCalled();
  });
});
