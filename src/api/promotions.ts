import { apiGet } from '@/src/services/api';

const SPECIAL_VENDOR_ACTIONS = 'SPECIAL_VENDOR_ACTIONS';

export const PROMOTION_FALLBACK_DESCRIPTION = 'Discover amazing deals and shop from trusted sellers.';
export const PROMOTION_FALLBACK_BACKGROUND = '#1a56db';
export const PROMOTION_FALLBACK_TEXT = '#ffffff';

export type Promotion = {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  background_color?: string | null;
  text_color?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  display_order?: number | null;
  is_active?: boolean | null;
};

export type PromotionCta = {
  label: string;
  link: string;
};

export function sortPromotionsByDisplayOrder(items: Promotion[]): Promotion[] {
  return [...items].sort((a, b) => {
    const aOrder = Number(a.display_order ?? Number.MAX_SAFE_INTEGER);
    const bOrder = Number(b.display_order ?? Number.MAX_SAFE_INTEGER);
    if (aOrder === bOrder) return String(a.id).localeCompare(String(b.id));
    return aOrder - bOrder;
  });
}

function splitPipeValue(value?: string | null): string[] {
  return (value ?? '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parsePromotionCtas(promotion: Promotion): PromotionCta[] {
  const rawLink = String(promotion.button_link ?? '').trim();
  if (!rawLink) return [];

  if (rawLink === SPECIAL_VENDOR_ACTIONS) {
    return [
      { label: 'Start Shopping', link: '/shop' },
      { label: 'Become a Seller', link: '/auth/sign-up?userType=vendor' },
      { label: 'Become a Transporter', link: '/auth/sign-up?userType=transporter' },
    ];
  }

  const labels = splitPipeValue(promotion.button_text);
  const links = splitPipeValue(promotion.button_link);
  if (links.length === 0) return [];

  const fallbackLabel = labels[0] ?? 'Learn more';
  const fallbackLink = links[0];
  const max = Math.max(labels.length, links.length);

  return Array.from({ length: max }, (_, index) => ({
    label: labels[index] ?? fallbackLabel,
    link: links[index] ?? fallbackLink,
  })).filter((cta) => Boolean(cta.link));
}

function isPromotionActive(item: Promotion): boolean {
  return item.is_active == null ? true : item.is_active === true;
}

function normalizePromotionsResponse(payload: unknown): Promotion[] {
  if (Array.isArray(payload)) return payload as Promotion[];
  if (payload && typeof payload === 'object') {
    const root = payload as Record<string, unknown>;
    if (Array.isArray(root.data)) return root.data as Promotion[];
    if (Array.isArray(root.promotions)) return root.promotions as Promotion[];
  }
  return [];
}

export async function fetchPromotions(): Promise<Promotion[]> {
  const payload = await apiGet<unknown>('/promotions');
  const promotions = normalizePromotionsResponse(payload);
  const active = promotions.filter(isPromotionActive);
  return sortPromotionsByDisplayOrder(active);
}
