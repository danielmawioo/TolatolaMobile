import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import type { FundStatus } from '@/src/hooks/useTrackingStatusData';

interface Props {
  fundStatus: FundStatus;
}

const FUND_STEP_ICONS: Record<string, React.ComponentProps<typeof FontAwesome>['name']> = {
  payment_received: 'money',
  protected: 'lock',
  pending_settlement: 'clock-o',
  vendor_paid: 'credit-card',
  transporter_paid: 'truck',
  settlement_completed: 'check-circle',
};

/** Real-time escrow/fund-status widget for the guest tracking screen. */
export function FundStatusCard({ fundStatus }: Props) {
  const timeline = fundStatus.timeline || [];

  return (
    <View style={styles.fundStatusCard}>
      <View style={styles.fundStatusHeader}>
        <FontAwesome name="shield" size={16} color={Theme.primary} />
        <Text style={styles.sectionTitle}>REAL-TIME FUND STATUS</Text>
        <View style={styles.fundStatusBadge}>
          <Text style={styles.fundStatusBadgeText}>
            {(fundStatus.status || '').replace(/_/g, ' ').toLowerCase()}
          </Text>
        </View>
      </View>

      <View style={styles.fundTimeline}>
        {timeline.map((step, idx) => {
          const isCompleted = step.status === 'completed';
          const isLast = idx === timeline.length - 1;
          const iconName = FUND_STEP_ICONS[step.key] || 'circle-o';

          return (
            <View key={step.key} style={styles.fundTimelineRow}>
              {/* Vertical connector line */}
              {!isLast && (
                <View style={[
                  styles.fundTimelineConnector,
                  isCompleted ? styles.fundConnectorDone : styles.fundConnectorPending
                ]} />
              )}
              {/* Icon circle */}
              <View style={[
                styles.fundTimelineIcon,
                isCompleted ? styles.fundIconDone : styles.fundIconPending
              ]}>
                <FontAwesome
                  name={iconName}
                  size={12}
                  color={isCompleted ? '#16a34a' : Theme.textMuted}
                />
              </View>
              {/* Text */}
              <View style={styles.fundTimelineContent}>
                <Text style={[
                  styles.fundStepLabel,
                  isCompleted ? styles.fundStepLabelDone : styles.fundStepLabelPending
                ]}>
                  {step.label}
                </Text>
                <Text style={styles.fundStepDesc}>{step.description}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.fundDisclaimer}>
        <FontAwesome name="info-circle" size={12} color={Theme.textMuted} style={{ marginTop: 2 }} />
        <Text style={styles.fundDisclaimerText}>
          TOLA does not hold customer funds or operate a wallet; it only displays the real-time fund status provided by our payment and escrow partners.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Theme.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  fundStatusCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Theme.shadowSm,
    marginBottom: 20,
    padding: 20,
  },
  fundStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  fundStatusBadge: {
    marginLeft: 'auto',
    backgroundColor: Theme.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.primary + '20',
  },
  fundStatusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.primary,
    textTransform: 'capitalize',
  },
  fundTimeline: {
    gap: 0,
  },
  fundTimelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 20,
    position: 'relative',
  },
  fundTimelineConnector: {
    position: 'absolute',
    left: 15,
    top: 30,
    width: 2,
    height: '100%',
  },
  fundConnectorDone: {
    backgroundColor: '#16a34a40',
  },
  fundConnectorPending: {
    backgroundColor: Theme.inputBorder,
  },
  fundTimelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    zIndex: 1,
  },
  fundIconDone: {
    borderColor: '#16a34a',
  },
  fundIconPending: {
    borderColor: Theme.inputBorder,
  },
  fundTimelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  fundStepLabel: {
    fontSize: 14,
  },
  fundStepLabelDone: {
    fontWeight: '700',
    color: Theme.text,
  },
  fundStepLabelPending: {
    fontWeight: '500',
    color: Theme.textMuted,
  },
  fundStepDesc: {
    fontSize: 12,
    color: Theme.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  fundDisclaimer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Theme.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    padding: 12,
    marginTop: 4,
  },
  fundDisclaimerText: {
    flex: 1,
    fontSize: 11,
    color: Theme.textMuted,
    lineHeight: 16,
  },
});
