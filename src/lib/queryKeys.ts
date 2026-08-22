/**
 * Central TanStack Query keys for API and local caches.
 * Use factories so token/ids stay consistent; use `*Prefix` helpers for broad invalidation.
 */
export const queryKeys = {
  api: {
    profile: (token: string | null | undefined) => ['api', 'profile', token ?? null] as const,
    profilePrefix: () => ['api', 'profile'] as const,

    transportMethods: (token: string) => ['api', 'transport-methods', token] as const,

    notifications: {
      scope: (token: string) => ['api', 'notifications', token] as const,
      list: (token: string, pageSize: number, role: string) =>
        ['api', 'notifications', token, pageSize, role] as const,
      unread: (token: string, role: string) => ['api', 'notifications-unread', token, role] as const,
      unreadScope: (token: string) => ['api', 'notifications-unread', token] as const,
    },

    transporterJobs: (token: string) => ['api', 'transporter-jobs', token] as const,
    transporterOnboarding: (token: string) => ['api', 'transporter-onboarding', token] as const,

    vendorOnboarding: (token: string) => ['api', 'vendor-onboarding', token] as const,

    adminMyRole: (token: string) => ['api', 'admin-my-role', token] as const,

    orders: (token: string) => ['api', 'orders', token] as const,
    order: (orderId: string, token: string) => ['api', 'order', orderId, token] as const,

    shop: (shopId: string) => ['api', 'shop', shopId] as const,
    shopProducts: (shopId: string, lat: number | null | undefined, lng: number | null | undefined) =>
      ['api', 'shop-products', shopId, lat ?? null, lng ?? null] as const,
    /** Invalidate all proximity variants for a shop */
    shopProductsByShop: (shopId: string) => ['api', 'shop-products', shopId] as const,

    categories: () => ['api', 'categories'] as const,
    products: (path: string) => ['api', 'products', path] as const,
    productsPrefix: () => ['api', 'products'] as const,

    banners: () => ['api', 'banners'] as const,
    promotions: () => ['api', 'promotions'] as const,

    vendorShop: (token: string) => ['api', 'vendor-shop', token] as const,
    vendorShopProducts: (shopId: string, token: string) => ['api', 'vendor-shop-products', shopId, token] as const,
    vendorShopProductsPrefix: () => ['api', 'vendor-shop-products'] as const,
    vendorShopOrders: (shopId: string, token: string) => ['api', 'vendor-shop-orders', shopId, token] as const,
    vendorFinanceSummary: (token: string) => ['api', 'vendor-finance-summary', token] as const,
    vendorPayouts: (token: string) => ['api', 'vendor-payouts', token] as const,

    vendorProduct: (productId: string, token: string) => ['api', 'vendor-product', productId, token] as const,
    transporterFinanceSummary: (token: string) => ['api', 'transporter-finance-summary', token] as const,
    transporterPayouts: (token: string) => ['api', 'transporter-payouts', token] as const,

    trackingStatus: (guestToken: string) => ['api', 'tracking-status', guestToken] as const,
  },
  local: {
    deliveryAddress: (uid: string | null | undefined) => ['local', 'delivery-address', uid ?? null] as const,
  },
} as const;
