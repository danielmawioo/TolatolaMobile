/**
 * Post-login redirect by user_type (matches Tolatola-Client).
 * admin → Admin dashboard, vendor → Vendor dashboard, transporter → Transporter dashboard,
 * customer or default → Shop (buyer home).
 */
export type UserType = 'admin' | 'vendor' | 'transporter' | 'customer' | 'agent';

export function getRoleRedirectPath(userType: string | undefined): string {
  switch (userType) {
    case 'admin':
      return '/(admin)';
    case 'vendor':
      return '/(vendor)/dashboard';
    case 'transporter':
      return '/(transporter)/dashboard';
    case 'agent':
      return '/(agent)/dashboard';
    case 'customer':
    default:
      return '/(tabs)';
  }
}
