/**
 * Checkout constants — mirrors the web client's checkout-content.tsx payment methods
 * and Tanzania address regions.
 */

export const TANZANIA_REGIONS = [
  "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera", "Katavi", "Kigoma",
  "Kilimanjaro", "Lindi", "Manyara", "Mara", "Mbeya", "Morogoro", "Mtwara", "Mwanza",
  "Njombe", "Pemba North", "Pemba South", "Pwani", "Rukwa", "Ruvuma", "Shinyanga",
  "Simiyu", "Singida", "Songwe", "Tabora", "Tanga", "Zanzibar North",
  "Zanzibar South and Central", "Zanzibar West",
];

export const MOBILE_MONEY_PROVIDERS: readonly { id: string; name: string; provider: string; maintenance?: boolean }[] = [
  { id: 'airtel-money', name: 'Airtel Money', provider: 'Airtel' },
  { id: 'mixx-by-yas', name: 'Mixx by Yas', provider: 'Tigo Pesa' },
  { id: 'halopesa', name: 'HaloPesa', provider: 'Halotel' },
  { id: 'ezypesa', name: 'EzyPesa', provider: 'Zantel' },
  { id: 'm-pesa', name: 'M-Pesa', provider: 'Vodacom', maintenance: true },
];

export const CARD_PROVIDERS = [
  { id: 'visa', name: 'Visa' },
  { id: 'mastercard', name: 'Mastercard' },
  { id: 'unionpay', name: 'UnionPay' },
] as const;

export const BANK_PROVIDERS = [
  { id: 'crdb-simbanking', name: 'CRDB SimBanking' },
  { id: 'crdb-internet-banking', name: 'CRDB Internet Banking' },
  { id: 'crdb-wakala', name: 'CRDB Wakala' },
  { id: 'crdb-branch-otc', name: 'CRDB Branch OTC' },
] as const;

export const BUYER_PROTECTION_RATE = 0.015;

export type AddressData = {
  country: string;
  region: string;
  district: string;
  ward: string;
  village: string;
  street: string;
};

export type TransportMethod = {
  id: string;
  name: string;
  description?: string;
  rate_per_km?: number;
  rate_per_kg?: number;
};

export const INITIAL_ADDRESS: AddressData = {
  country: 'Tanzania',
  region: '',
  district: '',
  ward: '',
  village: '',
  street: '',
};
