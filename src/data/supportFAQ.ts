/**
 * Tola Support FAQ Knowledge Base
 *
 * Each entry contains a user-facing question, the bot's answer,
 * a category tag, and a set of keywords for pattern-matching.
 */

export interface FAQEntry {
  id: string;
  category: 'orders' | 'payments' | 'account' | 'selling' | 'shipping' | 'general';
  question: string;
  answer: string;
  keywords: string[];
}

export const SUPPORT_FAQ: FAQEntry[] = [
  // ───────────────── Orders & Tracking ─────────────────
  {
    id: 'track-order',
    category: 'orders',
    question: 'How do I track my order?',
    answer:
      'You can track your order by going to the "Track Order" button on the Home or Shop screen. Enter your order number or tracking code and you\'ll see real-time status updates including pickup, in-transit, and delivery stages.',
    keywords: ['track', 'tracking', 'order', 'status', 'where', 'shipment', 'delivery', 'locate', 'find order'],
  },
  {
    id: 'cancel-order',
    category: 'orders',
    question: 'Can I cancel my order?',
    answer:
      'You can cancel your order if it hasn\'t been picked up yet. Go to Profile → Orders, find the order, and tap "Cancel". Once the order is in transit, cancellation is no longer possible — but you can request a return after delivery.',
    keywords: ['cancel', 'cancellation', 'stop order', 'remove order', 'undo order'],
  },
  {
    id: 'return-policy',
    category: 'orders',
    question: 'What is your return policy?',
    answer:
      'Tola supports returns within 7 days of delivery for most products. The item must be unused and in original packaging. Go to Profile → Orders → select the order → "Request Return". The seller will review and process your return.',
    keywords: ['return', 'refund', 'exchange', 'send back', 'policy', 'damaged', 'wrong item', 'defective'],
  },
  {
    id: 'order-not-received',
    category: 'orders',
    question: 'I haven\'t received my order',
    answer:
      'If your order is delayed, first check the tracking status using "Track Order". If tracking shows "Delivered" but you haven\'t received it, please contact our support team immediately with your order number so we can investigate.',
    keywords: ['not received', 'missing', 'delayed', 'late', 'haven\'t received', 'where is my order', 'lost'],
  },

  // ───────────────── Payments ─────────────────
  {
    id: 'payment-methods',
    category: 'payments',
    question: 'What payment methods are accepted?',
    answer:
      'Tola accepts Mobile Money (M-Pesa, Tigo Pesa, Airtel Money, Halo Pesa), bank transfers, and card payments. You can select your preferred method at checkout.',
    keywords: ['payment', 'pay', 'method', 'mobile money', 'mpesa', 'tigo', 'airtel', 'card', 'bank', 'how to pay'],
  },
  {
    id: 'refund-timeline',
    category: 'payments',
    question: 'How long do refunds take?',
    answer:
      'Refunds are typically processed within 3–7 business days after approval. Mobile Money refunds arrive within 24–48 hours. Bank/card refunds may take 5–10 business days depending on your bank.',
    keywords: ['refund', 'money back', 'how long refund', 'when refund', 'refund time', 'get money back'],
  },
  {
    id: 'payment-failed',
    category: 'payments',
    question: 'My payment failed',
    answer:
      'If your payment failed, please check:\n• Sufficient balance in your account\n• Correct phone number or card details\n• Stable internet connection\n\nTry again, or switch to a different payment method. If the amount was deducted but the order wasn\'t confirmed, contact support — we\'ll resolve it within 24 hours.',
    keywords: ['payment failed', 'error', 'declined', 'unsuccessful', 'not going through', 'transaction failed', 'deducted'],
  },

  // ───────────────── Account ─────────────────
  {
    id: 'reset-password',
    category: 'account',
    question: 'How do I reset my password?',
    answer:
      'Go to the Sign In screen and tap "Forgot Password". Enter your email address and we\'ll send a password reset link. Check your inbox (and spam folder) and follow the link to set a new password.',
    keywords: ['password', 'reset', 'forgot', 'change password', 'login problem', 'can\'t sign in', 'locked out'],
  },
  {
    id: 'update-profile',
    category: 'account',
    question: 'How do I update my profile?',
    answer:
      'Go to the Profile tab → tap "Edit Profile" at the top. You can update your name, phone number, profile photo, and delivery address. Make sure to tap "Save" when done.',
    keywords: ['update', 'edit', 'profile', 'name', 'phone', 'address', 'photo', 'change details'],
  },
  {
    id: 'delete-account',
    category: 'account',
    question: 'How do I delete my account?',
    answer:
      'To delete your account, go to Profile → Settings → scroll down to "Delete Account". This action is permanent and will remove all your data, order history, and favorites. Active orders must be completed first.',
    keywords: ['delete', 'remove', 'close account', 'deactivate', 'account deletion'],
  },
  {
    id: 'sign-up',
    category: 'account',
    question: 'How do I create an account?',
    answer:
      'Tap "Sign Up" on the welcome screen. You can register with your email and password, or sign in with Google. Fill in your name, phone number, and you\'re ready to start shopping!',
    keywords: ['sign up', 'register', 'create account', 'new account', 'join', 'how to register'],
  },

  // ───────────────── Selling ─────────────────
  {
    id: 'become-vendor',
    category: 'selling',
    question: 'How do I become a seller on Tola?',
    answer:
      'To start selling on Tola:\n1. Create an account (or sign in)\n2. Go to Profile → "Become a Seller"\n3. Complete KYC verification (ID + business info)\n4. Once approved, access your Seller Hub to list products\n\nKYC review typically takes 1–3 business days.',
    keywords: ['sell', 'seller', 'vendor', 'become vendor', 'list products', 'start selling', 'shop', 'business', 'kyc'],
  },
  {
    id: 'list-product',
    category: 'selling',
    question: 'How do I list a product?',
    answer:
      'From your Seller Hub dashboard, tap "Add Product". Fill in the product name, description, price, category, upload photos (up to 5), set stock quantity, and tap "Publish". Your product will be reviewed and approved within 24 hours.',
    keywords: ['list', 'add product', 'upload product', 'create listing', 'post item', 'new product'],
  },
  {
    id: 'seller-fees',
    category: 'selling',
    question: 'What are the seller fees?',
    answer:
      'Tola charges a small commission on each sale. The exact rate depends on your subscription plan. Free-tier sellers pay a standard commission, while premium sellers enjoy lower rates and additional features. Check Seller Hub → Subscription for details.',
    keywords: ['fees', 'commission', 'charges', 'cost', 'seller fee', 'pricing', 'subscription', 'plan'],
  },

  // ───────────────── Shipping ─────────────────
  {
    id: 'delivery-time',
    category: 'shipping',
    question: 'How long does delivery take?',
    answer:
      'Delivery times depend on your location:\n• Within city (Dar es Salaam): 1–3 days\n• Regional (other cities): 3–7 days\n• Remote areas: 5–14 days\n\nYou\'ll receive tracking updates at each stage of delivery.',
    keywords: ['delivery', 'time', 'how long', 'when arrive', 'shipping time', 'days', 'duration', 'eta'],
  },
  {
    id: 'shipping-cost',
    category: 'shipping',
    question: 'How much does shipping cost?',
    answer:
      'Shipping costs are calculated at checkout based on the product weight, size, and delivery distance. Some sellers offer free shipping on qualifying orders. You\'ll see the exact shipping cost before confirming your order.',
    keywords: ['shipping cost', 'delivery fee', 'how much shipping', 'postage', 'delivery charge', 'freight'],
  },
  {
    id: 'delivery-areas',
    category: 'shipping',
    question: 'Where do you deliver?',
    answer:
      'Tola delivers across all regions of Tanzania including Dar es Salaam, Arusha, Dodoma, Mwanza, Mbeya, Zanzibar, and more. Coverage extends to both urban and rural areas through our transporter network.',
    keywords: ['deliver', 'area', 'region', 'coverage', 'where deliver', 'location', 'zanzibar', 'dar', 'arusha', 'tanzania'],
  },
  {
    id: 'become-transporter',
    category: 'shipping',
    question: 'How do I become a transporter?',
    answer:
      'To join as a transporter:\n1. Create an account\n2. Go to Profile → "Become a Transporter"\n3. Complete verification with your vehicle details and ID\n4. Once approved, you\'ll receive delivery assignments in your area\n\nTransporters earn per delivery and can set their availability.',
    keywords: ['transporter', 'delivery driver', 'courier', 'become transporter', 'deliver items', 'driver'],
  },

  // ───────────────── General ─────────────────
  {
    id: 'what-is-tolatola',
    category: 'general',
    question: 'What is Tola?',
    answer:
      'Tola is Tanzania\'s B2B and B2C marketplace connecting sellers, buyers, and transporters. We offer a wide range of products from electronics and fashion to agriculture and construction materials, with built-in secure payments and delivery tracking.',
    keywords: ['what is', 'tola', 'tolatola', 'about', 'marketplace', 'company', 'platform', 'who are you'],
  },
  {
    id: 'contact-info',
    category: 'general',
    question: 'How can I contact Tola?',
    answer:
      'You can reach us through:\n• This support chat (available 24/7 for FAQ)\n• Email: support@tola.co\n• Website: www.tola.co\n\nFor urgent issues, use the "Connect to Human Support" option below to chat with our team directly.',
    keywords: ['contact', 'reach', 'email', 'phone', 'call', 'whatsapp', 'customer service', 'talk to someone'],
  },
  {
    id: 'operating-hours',
    category: 'general',
    question: 'What are your operating hours?',
    answer:
      'Our AI support agent is available 24/7. Human support agents are available Monday–Saturday, 8:00 AM – 8:00 PM (EAT). For urgent matters outside these hours, please submit a ticket and we\'ll respond first thing next business day.',
    keywords: ['hours', 'operating', 'open', 'available', 'when available', 'business hours', 'working hours'],
  },
  {
    id: 'app-not-working',
    category: 'general',
    question: 'The app is not working properly',
    answer:
      'If you\'re experiencing issues:\n1. Make sure you have the latest version of the app\n2. Check your internet connection\n3. Try closing and reopening the app\n4. Clear the app cache (Settings → Apps → Tola → Clear Cache)\n\nIf the problem persists, contact our support team with a description of the issue.',
    keywords: ['not working', 'bug', 'crash', 'error', 'problem', 'issue', 'broken', 'glitch', 'freeze', 'slow'],
  },
  {
    id: 'promotions',
    category: 'general',
    question: 'How do promotions and discounts work?',
    answer:
      'Tola regularly offers promotions and discounts! Check the Home screen banners for current deals. Some sellers also offer their own discounts — look for products with a "Compare At" price showing the original price crossed out.',
    keywords: ['promotion', 'discount', 'sale', 'offer', 'deal', 'coupon', 'promo code', 'special offer'],
  },
  {
    id: 'referral-program',
    category: 'general',
    question: 'Is there a referral program?',
    answer:
      'Yes! Tola has a referral program. Share your referral link with friends and earn rewards when they sign up and make their first purchase. Check Profile → Agent Dashboard for your unique referral link and earnings.',
    keywords: ['referral', 'refer', 'invite', 'share', 'earn', 'friend', 'referral link', 'agent'],
  },
];


/**
 * Quick suggestion chips shown at the start of a support chat.
 * Subset of the most commonly asked questions.
 */
export const QUICK_SUGGESTIONS: string[] = [
  'How do I track my order?',
  'What payment methods are accepted?',
  'How long does delivery take?',
  'How do I become a seller?',
  'Can I cancel my order?',
  'How do I reset my password?',
  'What is your return policy?',
  'How much does shipping cost?',
];
