import { Platform, Share } from 'react-native';

/** Public storefront (deep links / marketing). */
const PUBLIC_WEB = 'https://tolatola.co';

export type ShareProductParams = {
  name: string;
  price: number;
  currency: string;
  productId: string;
};

/**
 * Opens the native share sheet with title, price, and a web link.
 * Android only reliably shows `message`; iOS accepts message + optional title.
 */
export async function shareProduct(params: ShareProductParams): Promise<void> {
  const { name, price, currency, productId } = params;
  const priceStr = `${currency} ${Number(price).toLocaleString()}`;
  const webUrl = `${PUBLIC_WEB}/?product=${encodeURIComponent(productId)}`;
  const body = `${name}\n${priceStr} on TOLA\n${webUrl}`;

  try {
    if (Platform.OS === 'android') {
      await Share.share({ title: name, message: body });
    } else {
      await Share.share({ message: body });
    }
  } catch {
    /* user dismissed sheet or share unavailable */
  }
}
