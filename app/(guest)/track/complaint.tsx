import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/src/services/api';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';

const COMPLAINT_REASONS = [
  'DELAYED_DELIVERY',
  'DAMAGED_GOODS',
  'MISSING_ITEMS',
  'WRONG_ITEM',
  'OTHER',
];

export default function TrackComplaintScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token: string; orderId: string }>();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!reason.trim() || !description.trim()) {
      setError('Please select a reason and add a description');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('token', params.token || '');
      formData.append('order_id', params.orderId || '');
      formData.append('reason', reason);
      formData.append('description', description);
      await apiFetch('/tracking/complaint', {
        method: 'POST',
        body: formData,
        headers: new Headers(), // no Content-Type so FormData sets boundary
      });
      router.replace({ pathname: '/(guest)/track/status', params: { token: params.token || '' } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 16,
          paddingBottom: 48 + insets.bottom,
          paddingHorizontal: gap.md,
        },
      ]}
    >
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Raise complaint</Text>

      <Text style={styles.label}>Reason</Text>
      <View style={styles.reasonWrap}>
        {COMPLAINT_REASONS.map((r) => (
          <Pressable
            key={r}
            style={[styles.reasonChip, reason === r && styles.reasonChipActive]}
            onPress={() => setReason(r)}
          >
            <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>{r.replace(/_/g, ' ')}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Describe the issue..."
        placeholderTextColor={Theme.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Submitting…' : 'Submit'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  content: { paddingBottom: 24 },
  back: { marginBottom: 24 },
  backText: { fontSize: 16, color: Theme.link },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Theme.text, marginBottom: 8 },
  reasonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  reasonChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Theme.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  reasonChipActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  reasonText: { fontSize: 13, color: Theme.text },
  reasonTextActive: { color: '#fff' },
  textArea: {
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: Theme.radiusMd,
    padding: 14,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
    backgroundColor: Theme.inputBg,
    color: Theme.text,
  },
  error: { color: Theme.error, marginBottom: 12 },
  button: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    borderRadius: Theme.radiusMd,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
