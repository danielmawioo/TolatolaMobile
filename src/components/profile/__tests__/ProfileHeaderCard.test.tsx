import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProfileHeaderCard } from '@/src/components/profile/ProfileHeaderCard';

describe('ProfileHeaderCard', () => {
  it('renders the user name, email and initials when there is no avatar', () => {
    render(
      <ProfileHeaderCard
        userName="Asha Vendor"
        userEmail="asha@example.com"
        initials="AV"
        profileImageUrl={null}
        rawKycStatus={undefined}
      />
    );

    expect(screen.getByText('Asha Vendor')).toBeTruthy();
    expect(screen.getByText('asha@example.com')).toBeTruthy();
    expect(screen.getByText('AV')).toBeTruthy();
    expect(screen.getByText('Not Verified')).toBeTruthy();
  });

  it('shows a Verified badge when the KYC status is approved', () => {
    render(
      <ProfileHeaderCard
        userName="Asha Vendor"
        userEmail="asha@example.com"
        initials="AV"
        profileImageUrl={null}
        rawKycStatus="approved"
      />
    );

    expect(screen.getByText('Verified')).toBeTruthy();
  });

  it('shows a Pending Review badge when the KYC status is pending', () => {
    render(
      <ProfileHeaderCard
        userName="Asha Vendor"
        userEmail="asha@example.com"
        initials="AV"
        profileImageUrl={null}
        rawKycStatus="pending"
      />
    );

    expect(screen.getByText('Pending Review')).toBeTruthy();
  });
});
