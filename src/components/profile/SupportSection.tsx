import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { apiGet, apiPost } from '@/src/services/api';

const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444', in_progress: '#eab308', resolved: '#16a34a',
};
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

interface Props { accessToken: string; }

export function SupportSection({ accessToken }: Props) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('low');
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadTickets(); }, [accessToken]);

  const loadTickets = async () => {
    try {
      const res = await apiGet<any>('/support/tickets', accessToken);
      setTickets(Array.isArray(res) ? res : res?.tickets || []);
    } catch (e) { console.error('Tickets load error', e); }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) { Alert.alert('Required', 'Please fill in subject and message'); return; }
    setCreating(true);
    try {
      await apiPost('/support/tickets', { subject, message, priority }, accessToken);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Support ticket created');
      setShowCreate(false); setSubject(''); setMessage(''); setPriority('low');
      loadTickets();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to create ticket'); }
    setCreating(false);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={Theme.primary} /></View>;

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <Text style={s.desc}>Manage your support requests.</Text>
        <Pressable style={s.newBtn} onPress={() => setShowCreate(true)}>
          <FontAwesome name="plus-circle" size={14} color="#fff" />
          <Text style={s.newBtnText}>New Ticket</Text>
        </Pressable>
      </View>

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Create Support Ticket</Text>
              <Text style={s.modalSub}>Describe your issue and we'll connect you with an agent.</Text>
            </View>
            <ScrollView style={s.modalBody} contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
              <View style={s.field}><Text style={s.label}>Subject</Text>
                <TextInput style={s.input} value={subject} onChangeText={setSubject} placeholder="Brief description" placeholderTextColor={Theme.textMuted} />
              </View>
              <View style={s.field}><Text style={s.label}>Priority</Text>
                <View style={s.priorityRow}>
                  {PRIORITIES.map(p => (
                    <Pressable key={p} style={[s.priorityChip, priority === p && s.priorityActive]} onPress={() => setPriority(p)}>
                      <Text style={[s.priorityText, priority === p && { color: '#fff' }]}>{p}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={s.field}><Text style={s.label}>Message</Text>
                <TextInput style={[s.input, { height: 100, textAlignVertical: 'top' }]} value={message} onChangeText={setMessage} placeholder="Describe your issue..." placeholderTextColor={Theme.textMuted} multiline />
              </View>
            </ScrollView>
            <View style={s.modalFooter}>
              <Pressable style={[s.submitBtn, creating && { opacity: 0.5 }]} onPress={handleCreate} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Create Ticket</Text>}
              </Pressable>
              <Pressable style={s.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ticket List */}
      {tickets.length === 0 ? (
        <View style={s.empty}><FontAwesome name="comments" size={40} color={Theme.textMuted} /><Text style={s.emptyText}>No support tickets yet</Text></View>
      ) : (
        <View style={s.list}>
          {tickets.map(t => {
            const color = STATUS_COLORS[t.status] || '#6b7280';
            return (
              <View key={t.id} style={s.ticketCard}>
                <View style={s.ticketHeader}>
                  <Text style={s.ticketSubject} numberOfLines={1}>{t.subject}</Text>
                  <View style={[s.statusBadge, { backgroundColor: color + '18' }]}>
                    <Text style={[s.statusText, { color }]}>{(t.status || '').replace(/_/g, ' ')}</Text>
                  </View>
                </View>
                <Text style={s.ticketDesc} numberOfLines={2}>{t.description || t.message}</Text>
                <Text style={s.ticketDate}>Created: {new Date(t.created_at).toLocaleDateString()}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 16 },
  center: { padding: 40, alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  desc: { fontSize: 12, color: Theme.textMuted, flex: 1 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Theme.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: Theme.radiusSm },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { fontSize: 14, color: Theme.textMuted },
  list: { gap: 10 },
  ticketCard: { backgroundColor: Theme.background, padding: 14, borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: Theme.inputBorder, gap: 6 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketSubject: { fontSize: 15, fontWeight: '700', color: Theme.text, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  ticketDesc: { fontSize: 12, color: Theme.textSecondary, lineHeight: 18 },
  ticketDate: { fontSize: 10, color: Theme.textMuted },
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { backgroundColor: Theme.primary, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  modalSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  modalBody: { padding: 16, maxHeight: 350 },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary, textTransform: 'uppercase' },
  input: { backgroundColor: Theme.inputBg, borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: Theme.inputBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Theme.text },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Theme.inputBorder },
  priorityActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  priorityText: { fontSize: 12, fontWeight: '600', color: Theme.text, textTransform: 'capitalize' },
  modalFooter: { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: Theme.inputBorder },
  submitBtn: { backgroundColor: Theme.primary, paddingVertical: 14, borderRadius: Theme.radiusMd, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { borderWidth: 2, borderColor: Theme.inputBorder, paddingVertical: 10, borderRadius: Theme.radiusMd, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: Theme.textSecondary },
});
