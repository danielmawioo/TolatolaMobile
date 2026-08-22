import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { isGooglePlacesConfigured } from '@/src/config/env';
import {
  fetchPlaceDetails,
  fetchPlaceFormattedAddress,
  fetchPlacePredictions,
  type PlacePrediction,
} from '@/src/lib/googlePlaces';

const DEBOUNCE_MS = 350;

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  /** Set when user picks a Places result (for distance-based delivery). Cleared on free typing. */
  onResolvedCoordinates?: (coords: { lat: number; lng: number } | null) => void;
  placeholder?: string;
};

export function DeliveryAddressAutocomplete({
  value,
  onChangeText,
  onResolvedCoordinates,
  placeholder,
}: Props) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [resolving, setResolving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);

  const placesEnabled = isGooglePlacesConfigured();

  const clearDebounce = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearDebounce();
      listAbortRef.current?.abort();
      detailAbortRef.current?.abort();
    };
  }, []);

  const runAutocomplete = useCallback(async (q: string) => {
    if (!placesEnabled || q.trim().length < 2) {
      setPredictions([]);
      return;
    }
    listAbortRef.current?.abort();
    const ac = new AbortController();
    listAbortRef.current = ac;
    setLoadingList(true);
    try {
      const list = await fetchPlacePredictions(q, ac.signal);
      setPredictions(list);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setPredictions([]);
    } finally {
      setLoadingList(false);
    }
  }, [placesEnabled]);

  const handleChange = (t: string) => {
    onChangeText(t);
    onResolvedCoordinates?.(null);
    clearDebounce();
    if (!placesEnabled || t.trim().length < 2) {
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(() => runAutocomplete(t), DEBOUNCE_MS);
  };

  const handleSelect = async (p: PlacePrediction) => {
    clearDebounce();
    setPredictions([]);
    detailAbortRef.current?.abort();
    const ac = new AbortController();
    detailAbortRef.current = ac;
    setResolving(true);
    try {
      const details = await fetchPlaceDetails(p.placeId, ac.signal);
      if (details) {
        onChangeText(details.formattedAddress);
        onResolvedCoordinates?.({ lat: details.lat, lng: details.lng });
      } else {
        const formatted = await fetchPlaceFormattedAddress(p.placeId, ac.signal);
        onChangeText(formatted ?? p.description);
        onResolvedCoordinates?.(null);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        onChangeText(p.description);
        onResolvedCoordinates?.(null);
      }
    } finally {
      setResolving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.inputRow}>
        <FontAwesome name="map-marker" size={18} color={Theme.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={
            placeholder ??
            'Start typing an address (e.g. Sam Nujoma Rd, Dar es Salaam)'
          }
          placeholderTextColor={Theme.textMuted}
          value={value}
          onChangeText={handleChange}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          editable={!resolving}
          autoComplete="street-address"
        />
        {loadingList || resolving ? (
          <ActivityIndicator size="small" color={Theme.primary} style={styles.inputSpinner} />
        ) : null}
      </View>

      {placesEnabled ? (
        <Text style={styles.hint}>Suggestions favor Tanzania. You can still type your full address manually.</Text>
      ) : __DEV__ ? (
        <Text style={styles.hintMuted}>
          Add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY for Google address suggestions.
        </Text>
      ) : null}

      {predictions.length > 0 ? (
        <View style={styles.suggestionsWrap}>
          <ScrollView
            style={styles.suggestionsScroll}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {predictions.map((p) => (
              <Pressable
                key={p.placeId}
                style={({ pressed }) => [styles.suggestionRow, pressed && styles.suggestionRowPressed]}
                onPress={() => handleSelect(p)}
              >
                <FontAwesome name="map-pin" size={14} color={Theme.primary} style={styles.pinIcon} />
                <View style={styles.suggestionTextCol}>
                  {p.mainText ? (
                    <Text style={styles.suggestionMain} numberOfLines={2}>
                      {p.mainText}
                    </Text>
                  ) : (
                    <Text style={styles.suggestionMain} numberOfLines={2}>
                      {p.description}
                    </Text>
                  )}
                  {p.secondaryText ? (
                    <Text style={styles.suggestionSub} numberOfLines={2}>
                      {p.secondaryText}
                    </Text>
                  ) : p.mainText ? (
                    <Text style={styles.suggestionSub} numberOfLines={2}>
                      {p.description}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'relative' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Theme.background,
    borderRadius: Theme.radiusMd,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 10,
    minHeight: 88,
  },
  inputIcon: { marginTop: 4, marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    color: Theme.text,
    paddingVertical: 4,
    minHeight: 68,
  },
  inputSpinner: { marginTop: 6, marginLeft: 4 },
  hint: {
    fontSize: 12,
    color: Theme.textMuted,
    marginTop: 8,
    lineHeight: 17,
  },
  hintMuted: {
    fontSize: 12,
    color: Theme.textMuted,
    marginTop: 8,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  suggestionsWrap: {
    marginTop: 8,
    maxHeight: 220,
    borderRadius: Theme.radiusMd,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    backgroundColor: Theme.background,
    overflow: 'hidden',
    ...Theme.shadowSm,
  },
  suggestionsScroll: { maxHeight: 220 },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.inputBorder,
  },
  suggestionRowPressed: { backgroundColor: Theme.backgroundSecondary },
  pinIcon: { marginTop: 3, marginRight: 10 },
  suggestionTextCol: { flex: 1 },
  suggestionMain: { fontSize: 15, fontWeight: '600', color: Theme.text },
  suggestionSub: { fontSize: 13, color: Theme.textMuted, marginTop: 2 },
});
