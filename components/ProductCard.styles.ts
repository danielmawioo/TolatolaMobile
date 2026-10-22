import { StyleSheet } from 'react-native';
import { Theme } from '@/constants/Theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 220,
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.backgroundSecondary,
    ...Theme.shadowSm,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    position: 'relative',
    backgroundColor: Theme.inputBg,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  soldOutImage: {
    opacity: 0.6,
  },
  soldOutOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutBadge: {
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    transform: [{ rotate: '-12deg' }],
  },
  soldOutText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  badgesContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeNew: {
    backgroundColor: 'rgba(26, 86, 219, 0.9)',
  },
  badgeHot: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
  },
  badgeDeal: {
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  discountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: Theme.error,
    fontSize: 9,
    fontWeight: '900',
  },
  content: {
    padding: 12,
    flex: 1,
  },
  verifiedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 9,
    color: Theme.success,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  soldBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  soldBadgeText: {
    color: '#15803d',
    fontSize: 8,
    fontWeight: '800',
  },
  gradeBadge: {
    backgroundColor: Theme.inputBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gradeText: {
    color: Theme.textSecondary,
    fontSize: 8,
    fontWeight: '800',
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.text,
    lineHeight: 18,
    marginBottom: 8,
    minHeight: 36,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.textSecondary,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  locationContainer: {
    alignItems: 'flex-end',
    gap: 2,
    maxWidth: 90,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 86, 219, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  distanceText: {
    fontSize: 8,
    fontWeight: '900',
    color: Theme.primary,
  },
  locationLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 8,
    fontWeight: '700',
    color: Theme.textMuted,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B5ED7',
  },
  currency: {
    fontSize: 10,
    fontWeight: '600',
  },
  oldPrice: {
    fontSize: 11,
    color: Theme.textMuted,
    textDecorationLine: 'line-through',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: Theme.inputBorder,
    paddingTop: 12,
  },
  cartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    height: 36,
  },
  inCartButton: {
    backgroundColor: Theme.inputBg,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  disabledButton: {
    backgroundColor: Theme.inputBg,
  },
  cartButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  inCartText: {
    color: Theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  cartButtonTextDisabled: {
    color: Theme.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likedIcon: {
    borderColor: Theme.error,
    backgroundColor: 'rgba(220, 38, 38, 0.05)',
  },
});
