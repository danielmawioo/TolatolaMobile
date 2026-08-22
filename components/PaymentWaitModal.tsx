import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';
import { fetchPaymentStatus } from '@/src/api/payments';

export type PaymentWaitMode = 'poll' | 'manual_mobile' | 'manual_card';

type Props = {
  visible: boolean;
  mode: PaymentWaitMode;
  methodLabel: string;
  amountLabel: string;
  phoneTail?: string;
  /** Order id (UUID) to poll with GET /payments/:id */
  paymentIntentId?: string | null;
  accessToken?: string | null;
  confirmDelaySec?: number;
  onPollSucceeded: () => void;
  onManualConfirm: () => Promise<void>;
  onDismiss: () => void;
};

const POLL_MS = 2500;

export function PaymentWaitModal({
  visible,
  mode,
  methodLabel,
  amountLabel,
  phoneTail,
  paymentIntentId,
  accessToken,
  confirmDelaySec = 6,
  onPollSucceeded,
  onManualConfirm,
  onDismiss,
}: Props) {
  const [manualReady, setManualReady] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pollHint, setPollHint] = useState('Waiting for payment confirmation…');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);
  const maxPolls = 48;

  useEffect(() => {
    if (!visible) {
      setManualReady(false);
      setConfirming(false);
      setPollHint('Waiting for payment confirmation…');
      attemptsRef.current = 0;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (mode === 'manual_mobile' || mode === 'manual_card') {
      setManualReady(false);
      const t = setTimeout(() => setManualReady(true), confirmDelaySec * 1000);
      return () => clearTimeout(t);
    }

    if (mode === 'poll' && paymentIntentId) {
      const tick = async () => {
        attemptsRef.current += 1;
        if (attemptsRef.current > maxPolls) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setPollHint('Still waiting… Check your phone or try again.');
          return;
        }
        try {
          const s = await fetchPaymentStatus(accessToken ?? undefined, paymentIntentId);
          if (s === 'succeeded') {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            onPollSucceeded();
          } else if (s === 'failed') {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            Alert.alert('Payment not completed', 'The payment was cancelled or failed. You can try again.');
            onDismiss();
          }
        } catch {
          /* stay pending */
        }
      };
      tick();
      intervalRef.current = setInterval(tick, POLL_MS);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }

    return undefined;
  }, [visible, mode, paymentIntentId, accessToken, confirmDelaySec, onPollSucceeded, onDismiss]);

  const manualTitle =
    mode === 'manual_card' ? 'Complete card payment' : `Pay with ${methodLabel}`;

  const manualBody =
    mode === 'manual_card'
      ? `Amount ${amountLabel}. Complete the card step, then confirm below.`
      : `Amount ${amountLabel}. Approve on your phone${phoneTail ? ` (ending ${phoneTail})` : ''}, then confirm below.`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>
            {mode === 'poll' ? 'Confirming payment…' : manualTitle}
          </Text>

          {mode === 'poll' ? (
            <>
              <Text style={styles.body}>
                Payment request sent. Approve on your phone to continue.
              </Text>
              <ActivityIndicator size="large" color={Theme.primary} style={styles.spinner} />
              <Text style={styles.hint}>{pollHint}</Text>
            </>
          ) : (
            <>
              <Text style={styles.body}>{manualBody}</Text>
              {!manualReady ? (
                <View style={styles.waitRow}>
                  <ActivityIndicator color={Theme.primary} />
                  <Text style={styles.waitText}>Waiting for payment prompt…</Text>
                </View>
              ) : null}
            </>
          )}

          {mode !== 'poll' ? (
            <Pressable
              style={[styles.primaryBtn, (!manualReady || confirming) && styles.primaryBtnDisabled]}
              onPress={async () => {
                if (!manualReady || confirming) return;
                setConfirming(true);
                try {
                  await onManualConfirm();
                } finally {
                  setConfirming(false);
                }
              }}
              disabled={!manualReady || confirming}
            >
              {confirming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {mode === 'manual_card' ? 'I have completed payment' : 'I approved payment on my phone'}
                </Text>
              )}
            </Pressable>
          ) : null}

          <Pressable style={styles.secondaryBtn} onPress={onDismiss} disabled={confirming}>
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: gap.md,
  },
  sheet: {
    backgroundColor: Theme.background,
    borderRadius: 20,
    padding: 22,
    ...Theme.shadowLg,
  },
  title: { fontSize: 20, fontWeight: '800', color: Theme.text, marginBottom: 12 },
  body: { fontSize: 15, color: Theme.textSecondary, lineHeight: 22, marginBottom: 16 },
  spinner: { marginVertical: 12 },
  hint: { fontSize: 13, color: Theme.textMuted, textAlign: 'center', marginTop: 8 },
  waitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingVertical: 8,
  },
  waitText: { flex: 1, fontSize: 14, color: Theme.textSecondary },
  primaryBtn: {
    backgroundColor: Theme.primary,
    paddingVertical: 14,
    borderRadius: Theme.radiusMd,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  secondaryBtnText: { fontSize: 16, fontWeight: '600', color: Theme.textSecondary },
});
