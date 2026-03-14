/**
 * Centralized user-facing copy. Use these constants instead of inline strings
 * so wording is consistent and easier to change or translate later.
 */
export const COPY = {
  // App identity
  appName: 'TOLA Tanzania',
  tagline: 'Digital Trade & Supply Chain Ecosystem. Registered with TRA, BRELA & TCRA.',

  // Empty states
  empty: {
    wishlistTitle: 'No saved products',
    wishlistMessage: 'Items you save will appear here. Add from product detail.',
    wishlistAction: 'Browse products',
    ordersTitle: 'No orders yet',
    ordersMessage: 'Once you make a purchase, your orders will appear here.',
    ordersAction: 'Shop now',
    ordersLoginTitle: 'Please log in',
    ordersLoginMessage: 'You need to be logged in to view your order history.',
    cartTitle: 'Your cart is empty',
    cartMessage: 'Add some quality items to get started!',
    cartAction: 'Continue shopping',
    products: 'No products yet.',
    shopProducts: 'No products yet.',
  },

  // Auth
  auth: {
    login: 'Log in',
    signUp: 'Sign up',
    forgotPassword: 'Forgot password?',
    emailPlaceholder: 'Email or Phone',
    passwordPlaceholder: 'Password',
  },

  // Errors (generic)
  errors: {
    generic: 'Something went wrong. Please try again.',
    network: 'No connection. Check your internet and try again.',
  },
} as const;
