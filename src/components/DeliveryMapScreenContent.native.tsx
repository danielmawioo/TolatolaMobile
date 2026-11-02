/**
 * Legacy route entry kept for backwards compatibility.
 *
 * The actual in-app navigator now lives in
 * `src/components/transporter/TransporterNavigationScreen.tsx` and works on
 * both native and web. The file name is retained because
 * `app/(transporter)/delivery-map.tsx` and existing deep links point at it.
 */
export { default } from '@/src/components/transporter/TransporterNavigationScreen';
