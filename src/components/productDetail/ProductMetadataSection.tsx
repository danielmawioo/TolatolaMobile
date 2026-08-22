import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '@/constants/Theme';
import type { Product } from '@/src/types';

interface ProductMetadataSectionProps {
  product: Product;
  productLocation: string | null;
}

/**
 * "Product details" card: identifier/category/location plus the
 * category-specific spec rows (vehicle, spare part, ready-to-eat, drinks).
 */
export function ProductMetadataSection({ product, productLocation }: ProductMetadataSectionProps) {
  return (
    <View style={styles.metadataSection}>
      <View style={styles.metadataHeaderContainer}>
        <View style={styles.metadataHeaderIndicator} />
        <Text style={styles.metadataTitle}>PRODUCT DETAILS</Text>
      </View>
      <View style={styles.metadataList}>
        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>Identifier (SKU)</Text>
          <View style={styles.metadataTag}>
            <Text style={styles.metadataTagText}>{product.sku || 'N/A'}</Text>
          </View>
        </View>
        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>Category</Text>
          <View style={styles.metadataTag}>
            <Text style={styles.metadataTagText}>{product.categories?.name || 'Inventory'}</Text>
          </View>
        </View>
        {productLocation && (
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Location</Text>
            <View style={styles.metadataTag}>
              <Text style={styles.metadataTagText}>{productLocation}</Text>
            </View>
          </View>
        )}

        {/* Vehicle Specifications */}
        {product.vehicle_section === 'vehicle' && (
          <>
            {product.brand && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Brand / Make</Text>
                <Text style={styles.metadataValue}>{product.brand}</Text>
              </View>
            )}
            {product.model && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Model</Text>
                <Text style={styles.metadataValue}>{product.model}</Text>
              </View>
            )}
            {product.year && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Year</Text>
                <Text style={styles.metadataValue}>{product.year}</Text>
              </View>
            )}
            {product.mileage != null && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Mileage</Text>
                <Text style={styles.metadataValue}>{product.mileage.toLocaleString()} km</Text>
              </View>
            )}
            {product.transmission && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Transmission</Text>
                <Text style={styles.metadataValue}>{product.transmission}</Text>
              </View>
            )}
            {product.fuel_type && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Fuel Type</Text>
                <Text style={styles.metadataValue}>{product.fuel_type}</Text>
              </View>
            )}
            {product.engine_size && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Engine Size</Text>
                <Text style={styles.metadataValue}>{product.engine_size}</Text>
              </View>
            )}
            {product.condition && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Condition</Text>
                <Text style={styles.metadataValue}>{product.condition}</Text>
              </View>
            )}
          </>
        )}

        {/* Spare Parts Specifications */}
        {product.vehicle_section === 'spare_part' && (
          <>
            {product.model && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Part Name</Text>
                <Text style={styles.metadataValue}>{product.model}</Text>
              </View>
            )}
            {product.brand && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Brand</Text>
                <Text style={styles.metadataValue}>{product.brand}</Text>
              </View>
            )}
            {product.part_number && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Part Number</Text>
                <Text style={styles.metadataValue}>{product.part_number}</Text>
              </View>
            )}
            {product.compatibility && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Compatible Vehicles</Text>
                <Text style={styles.metadataValue}>{product.compatibility}</Text>
              </View>
            )}
            {product.condition && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Condition</Text>
                <Text style={styles.metadataValue}>{product.condition}</Text>
              </View>
            )}
          </>
        )}

        {/* Ready to Eat Specifications */}
        {(product.dietary_info || product.prep_time) && (
          <>
            {product.dietary_info && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Dietary Info</Text>
                <Text style={styles.metadataValue}>{product.dietary_info}</Text>
              </View>
            )}
            {product.prep_time && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Prep Time</Text>
                <Text style={styles.metadataValue}>{product.prep_time}</Text>
              </View>
            )}
          </>
        )}

        {/* Drinks Specifications */}
        {product.drink_section && (
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Drink Type</Text>
            <Text style={styles.metadataValue}>
              {product.drink_section === 'alcoholic' ? 'Alcoholic' : 'Non-Alcoholic'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metadataSection: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20, borderColor: '#f1f5f9', borderWidth: 1, marginTop: 16, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.02, shadowRadius: 16, elevation: 2 },
  metadataHeaderContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12 },
  metadataHeaderIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: Theme.primary },
  metadataTitle: { fontSize: 10, fontWeight: '900', color: '#0f172a', letterSpacing: 1.5 },
  metadataList: { gap: 4 },
  metadataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  metadataLabel: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  metadataValue: { fontSize: 12, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' },
  metadataTag: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  metadataTagText: { fontSize: 11, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' },
});
