import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { SelectedAttachment } from '@/src/hooks/useSupportChat';

interface AttachmentButtonProps {
  onPress: () => void;
}

/** Paperclip button that opens the "choose photo / PDF" attachment options. */
export function AttachmentButton({ onPress }: AttachmentButtonProps) {
  return (
    <Pressable style={s.attachBtn} onPress={onPress}>
      <FontAwesome name="paperclip" size={18} color="#64748b" />
    </Pressable>
  );
}

interface AttachmentPreviewBarProps {
  attachment: SelectedAttachment;
  onRemove: () => void;
}

/** Preview card shown above the input bar for a picked-but-not-yet-sent attachment. */
export function AttachmentPreviewBar({ attachment, onRemove }: AttachmentPreviewBarProps) {
  return (
    <View style={s.previewBar}>
      <View style={s.previewInfo}>
        {attachment.isPdf ? (
          <View style={s.previewPdfBadge}>
            <Text style={s.previewPdfBadgeText}>PDF</Text>
          </View>
        ) : (
          <Image source={{ uri: attachment.uri }} style={s.previewImage} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.previewFileName} numberOfLines={1}>{attachment.name}</Text>
          <Text style={s.previewSubText}>{attachment.isPdf ? 'PDF Document' : 'Picture'}</Text>
        </View>
      </View>
      <Pressable style={s.removeAttachmentBtn} onPress={onRemove}>
        <FontAwesome name="times" size={12} color="#475569" />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  attachBtn: {
    padding: 6,
    marginRight: 4,
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  previewImage: { width: 36, height: 36, borderRadius: 8 },
  previewPdfBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPdfBadgeText: { fontSize: 10, fontWeight: '900', color: '#dc2626' },
  previewFileName: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  previewSubText: { fontSize: 10, color: '#64748b' },
  removeAttachmentBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
