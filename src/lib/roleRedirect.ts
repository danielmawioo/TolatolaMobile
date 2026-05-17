/**
 * Post-login redirect by user_type (matches Tolatola-Client).
 * admin → Admin dashboard, vendor → Vendor dashboard, transporter → Transporter dashboard,
 * customer or default → Shop (buyer home).
 */
export type UserType = 'admin' | 'vendor' | 'transporter' | 'customer';

export function getRoleRedirectPath(userType: string | undefined): string {
  switch (userType) {
    case 'admin':
      return '/(admin)';
    case 'vendor':
      return '/(vendor)/dashboard';
    case 'transporter':
      return '/(transporter)/dashboard';
    case 'customer':
    default:
      return '/(tabs)';
  }
}
