import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import type { EditProductFormData } from '@/src/hooks/useEditProductData';

export type ActiveModal =
  | 'category'
  | 'subcategory'
  | 'grade'
  | 'weight_unit'
  | 'vehicle_section'
  | 'transmission'
  | 'fuel_type'
  | 'condition'
  | 'dietary_info'
  | 'prep_time'
  | 'drink_section'
  | null;

interface Props {
  activeModal: ActiveModal;
  setActiveModal: (modal: ActiveModal) => void;
  categories: any[];
  parentCategoryId: string;
  subCategoryId: string;
  setParentCategoryId: (id: string) => void;
  setSubCategoryId: (id: string) => void;
  formData: EditProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<EditProductFormData>>;
}

/**
 * Single bottom-sheet-style <Modal> that renders whichever picker list is active
 * (category / subcategory / grade / weight unit / vehicle section / transmission /
 * fuel type / condition / dietary info / prep time / drink section) for the vendor
 * "edit product" form.
 *
 * NOTE: app/(vendor)/product/create.tsx has a near-identical inline modal — it was
 * intentionally left untouched since create.tsx is out of scope for this pass, but
 * it is a strong future dedup candidate against this component.
 */
export function ProductOptionPickerModal({
  activeModal,
  setActiveModal,
  categories,
  parentCategoryId,
  subCategoryId,
  setParentCategoryId,
  setSubCategoryId,
  formData,
  setFormData,
}: Props) {
  return (
    <Modal
      visible={activeModal !== null}
      transparent
      animationType="slide"
      onRequestClose={() => setActiveModal(null)}
    >
      <Pressable style={styles.modalBackdrop} onPress={() => setActiveModal(null)}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {activeModal === 'category' ? 'Select Category' :
               activeModal === 'grade' ? 'Select Quality Grade' :
               activeModal === 'weight_unit' ? 'Select Weight Unit' :
               activeModal === 'vehicle_section' ? 'Select Section' :
               activeModal === 'transmission' ? 'Select Transmission' :
               activeModal === 'fuel_type' ? 'Select Fuel Type' :
               activeModal === 'condition' ? 'Select Condition' :
               activeModal === 'dietary_info' ? 'Select Dietary Info' :
               activeModal === 'prep_time' ? 'Select Prep Time' :
               activeModal === 'drink_section' ? 'Select Drink Type' : 'Select Option'}
            </Text>
            <Pressable onPress={() => setActiveModal(null)}>
              <FontAwesome name="times-circle" size={24} color={Theme.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalList}>
            {activeModal === 'category' ? (
              <>
                <Pressable
                  style={[
                    styles.modalItem,
                    !parentCategoryId && styles.modalItemActive
                  ]}
                  onPress={() => {
                    setParentCategoryId('');
                    setSubCategoryId('');
                    setFormData(f => ({ ...f, category_id: '' }));
                    setActiveModal(null);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    !parentCategoryId && styles.modalItemTextActive,
                    { color: Theme.textMuted }
                  ]}>
                    No Category
                  </Text>
                </Pressable>
                {categories.filter(c => !c.parent_id).sort((a, b) => {
                  const isAService = a.slug === "services" || a.name?.toLowerCase() === "services"
                  const isBService = b.slug === "services" || b.name?.toLowerCase() === "services"
                  if (isAService && !isBService) return 1
                  if (!isAService && isBService) return -1
                  return 0
                }).map((cat) => (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.modalItem,
                      parentCategoryId === cat.id && styles.modalItemActive
                    ]}
                    onPress={() => {
                      setParentCategoryId(cat.id);
                      const subs = categories.filter(c => c.parent_id === cat.id);
                      if (subs.length > 0) {
                        setSubCategoryId(subs[0].id);
                        setFormData(f => ({ ...f, category_id: subs[0].id }));
                      } else {
                        setSubCategoryId('');
                        setFormData(f => ({ ...f, category_id: cat.id }));
                      }
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[
                      styles.modalItemText,
                      parentCategoryId === cat.id && styles.modalItemTextActive
                    ]}>
                      {cat.name}
                    </Text>
                    {parentCategoryId === cat.id && (
                      <FontAwesome name="check" size={16} color={Theme.primary} />
                    )}
                  </Pressable>
                ))}
              </>
            ) : activeModal === 'subcategory' ? (
              <>
                {categories.filter(c => c.parent_id === parentCategoryId).map((cat) => (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.modalItem,
                      subCategoryId === cat.id && styles.modalItemActive
                    ]}
                    onPress={() => {
                      setSubCategoryId(cat.id);
                      // Auto-derive vehicle_section / drink_section from subcategory slug
                      if (cat.slug === 'spare-parts') {
                        setFormData(f => ({ ...f, category_id: cat.id, vehicle_section: 'spare_part' }));
                      } else if (cat.slug === 'vehicles-sub') {
                        setFormData(f => ({ ...f, category_id: cat.id, vehicle_section: 'vehicle' }));
                      } else if (cat.slug === 'non-alcoholic') {
                        setFormData(f => ({ ...f, category_id: cat.id, drink_section: 'non_alcoholic' }));
                      } else if (cat.slug === 'alcoholic') {
                        setFormData(f => ({ ...f, category_id: cat.id, drink_section: 'alcoholic' }));
                      } else {
                        setFormData(f => ({ ...f, category_id: cat.id, vehicle_section: '' }));
                      }
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[
                      styles.modalItemText,
                      subCategoryId === cat.id && styles.modalItemTextActive
                    ]}>
                      {cat.name}
                    </Text>
                    {subCategoryId === cat.id && (
                      <FontAwesome name="check" size={16} color={Theme.primary} />
                    )}
                  </Pressable>
                ))}
              </>
            ) : activeModal === 'grade' ? (
              <>
                <Pressable
                  style={[
                    styles.modalItem,
                    !formData.quality_grade && styles.modalItemActive
                  ]}
                  onPress={() => {
                    setFormData(f => ({ ...f, quality_grade: '' }));
                    setActiveModal(null);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    !formData.quality_grade && styles.modalItemTextActive,
                    { color: Theme.textMuted }
                  ]}>
                    No Quality Grade
                  </Text>
                </Pressable>
                {[
                  { value: 'A', label: 'Grade A (Premium)' },
                  { value: 'B', label: 'Grade B (Standard)' },
                  { value: 'C', label: 'Grade C (Basic)' },
                ].map((g) => (
                  <Pressable
                    key={g.value}
                    style={[
                      styles.modalItem,
                      formData.quality_grade === g.value && styles.modalItemActive
                    ]}
                    onPress={() => {
                      setFormData(f => ({ ...f, quality_grade: g.value }));
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[
                      styles.modalItemText,
                      formData.quality_grade === g.value && styles.modalItemTextActive
                    ]}>
                      {g.label}
                    </Text>
                    {formData.quality_grade === g.value && (
                      <FontAwesome name="check" size={16} color={Theme.primary} />
                    )}
                  </Pressable>
                ))}
              </>
            ) : activeModal === 'weight_unit' ? (
              <>
                {[
                  { value: 'Kg', label: 'Kilograms (Kg)' },
                  { value: 'g', label: 'Grams (g)' },
                  { value: 'Tons', label: 'Tons (Tons)' },
                ].map((u) => (
                  <Pressable
                    key={u.value}
                    style={[styles.modalItem, formData.weight_unit === u.value && styles.modalItemActive]}
                    onPress={() => {
                      setFormData(f => ({ ...f, weight_unit: u.value }));
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[styles.modalItemText, formData.weight_unit === u.value && styles.modalItemTextActive]}>
                      {u.label}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : activeModal === 'vehicle_section' ? (
              <>
                {[
                  { value: 'vehicle', label: 'Vehicle' },
                  { value: 'spare_part', label: 'Spare Part' },
                ].map((x) => (
                  <Pressable
                    key={x.value}
                    style={[styles.modalItem, formData.vehicle_section === x.value && styles.modalItemActive]}
                    onPress={() => {
                      setFormData(f => ({ ...f, vehicle_section: x.value }));
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[styles.modalItemText, formData.vehicle_section === x.value && styles.modalItemTextActive]}>
                      {x.label}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : activeModal === 'transmission' ? (
              <>
                {[
                  { value: 'Automatic', label: 'Automatic' },
                  { value: 'Manual', label: 'Manual' },
                ].map((x) => (
                  <Pressable
                    key={x.value}
                    style={[styles.modalItem, formData.transmission === x.value && styles.modalItemActive]}
                    onPress={() => {
                      setFormData(f => ({ ...f, transmission: x.value }));
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[styles.modalItemText, formData.transmission === x.value && styles.modalItemTextActive]}>
                      {x.label}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : activeModal === 'fuel_type' ? (
              <>
                {['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Other'].map((fType) => (
                  <Pressable
                    key={fType}
                    style={[styles.modalItem, formData.fuel_type === fType && styles.modalItemActive]}
                    onPress={() => {
                      setFormData(f => ({ ...f, fuel_type: fType }));
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[styles.modalItemText, formData.fuel_type === fType && styles.modalItemTextActive]}>
                      {fType}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : activeModal === 'condition' ? (
              <>
                {['New', 'Used', 'Reconditioned'].map((cond) => (
                  <Pressable
                    key={cond}
                    style={[styles.modalItem, formData.condition === cond && styles.modalItemActive]}
                    onPress={() => {
                      setFormData(f => ({ ...f, condition: cond }));
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[styles.modalItemText, formData.condition === cond && styles.modalItemTextActive]}>
                      {cond}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : activeModal === 'dietary_info' ? (
              <>
                {['Halal', 'Vegetarian', 'Vegan', 'Gluten-Free', 'None'].map((dInfo) => (
                  <Pressable
                    key={dInfo}
                    style={[styles.modalItem, formData.dietary_info === dInfo && styles.modalItemActive]}
                    onPress={() => {
                      setFormData(f => ({ ...f, dietary_info: dInfo }));
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[styles.modalItemText, formData.dietary_info === dInfo && styles.modalItemTextActive]}>
                      {dInfo}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : activeModal === 'prep_time' ? (
              <>
                {['Ready Now', '5-10 min', '10-20 min', '20-30 min', '30-60 min', '1+ hour'].map((pTime) => (
                  <Pressable
                    key={pTime}
                    style={[styles.modalItem, formData.prep_time === pTime && styles.modalItemActive]}
                    onPress={() => {
                      setFormData(f => ({ ...f, prep_time: pTime }));
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[styles.modalItemText, formData.prep_time === pTime && styles.modalItemTextActive]}>
                      {pTime}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : activeModal === 'drink_section' ? (
              <>
                {[
                  { label: 'Alcoholic', value: 'alcoholic' },
                  { label: 'Non-Alcoholic', value: 'non_alcoholic' }
                ].map((item) => (
                  <Pressable
                    key={item.value}
                    style={[styles.modalItem, formData.drink_section === item.value && styles.modalItemActive]}
                    onPress={() => {
                      setFormData(f => ({ ...f, drink_section: item.value }));
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[styles.modalItemText, formData.drink_section === item.value && styles.modalItemTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : null}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Theme.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Theme.text },
  modalList: { padding: 10 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 10 },
  modalItemActive: { backgroundColor: Theme.primary + '10' },
  modalItemText: { fontSize: 16, color: Theme.text },
  modalItemTextActive: { color: Theme.primary, fontWeight: '600' },
});
