import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ProductOptionPickerModal, type ActiveModal } from '@/src/components/vendorProduct/ProductOptionPickerModal';
import { initialProductFormData, type ProductFormData } from '@/src/lib/productForm';

/**
 * The modal is a <Modal visible={activeModal !== null}>; under the RN test
 * renderer, a non-visible Modal renders none of its children at all (verified
 * empirically), which is what gives us the "renders nothing when closed" case
 * for free rather than needing to inspect a hidden tree.
 *
 * For the close ("x") button and the backdrop, both an icon-only Pressable's own
 * host node and the FontAwesome icon glyph it wraps show up as matches for
 * `accessible: true` — pressing either one invokes the same onPress (verified
 * empirically) — so `UNSAFE_getAllByProps({ accessible: true })` finds the
 * document-order pair [backdrop, backdrop, closeButton, closeButton, ...list
 * items...] for the 'category'/'grade' modes that render a backdrop + header
 * close icon before their list. Regular text list items can be pressed directly
 * via `getByText`, since a press on a Pressable's text child bubbles up to the
 * Pressable's own onPress.
 */

function renderModal(overrides: Partial<React.ComponentProps<typeof ProductOptionPickerModal<ProductFormData>>> = {}) {
  const setActiveModal = jest.fn();
  const setParentCategoryId = jest.fn();
  const setSubCategoryId = jest.fn();
  const setFormData = jest.fn();
  const props = {
    activeModal: null as ActiveModal,
    setActiveModal,
    categories: [] as any[],
    parentCategoryId: '',
    subCategoryId: '',
    setParentCategoryId,
    setSubCategoryId,
    formData: { ...initialProductFormData },
    setFormData,
    ...overrides,
  };
  const utils = render(<ProductOptionPickerModal {...props} />);
  return { ...utils, setActiveModal, setParentCategoryId, setSubCategoryId, setFormData };
}

/** Applies the updater function passed to setFormData's most recent call to `prev`. */
function applyLastFormDataUpdate(setFormData: jest.Mock, prev: ProductFormData): ProductFormData {
  const updater = setFormData.mock.calls[setFormData.mock.calls.length - 1][0];
  return typeof updater === 'function' ? updater(prev) : updater;
}

describe('ProductOptionPickerModal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when activeModal is null', () => {
    renderModal({ activeModal: null });

    expect(screen.queryByText('Select Category')).toBeNull();
    expect(screen.UNSAFE_queryAllByProps({ accessible: true })).toHaveLength(0);
  });

  describe('category mode', () => {
    const CATEGORIES = [
      { id: 'svc', name: 'Services', slug: 'services', parent_id: null },
      { id: 'c1', name: 'Cat1', parent_id: null },
      { id: 'c2', name: 'Cat2', parent_id: null },
      { id: 'c1a', name: 'Cat1A', parent_id: 'c1' },
    ];

    it('renders the category list with the "services" category sorted last', () => {
      const { toJSON } = renderModal({ activeModal: 'category', categories: CATEGORIES });

      expect(screen.getByText('Select Category')).toBeTruthy();
      expect(screen.getByText('No Category')).toBeTruthy();
      expect(screen.getByText('Cat1')).toBeTruthy();
      expect(screen.getByText('Cat2')).toBeTruthy();
      expect(screen.getByText('Services')).toBeTruthy();

      const json = JSON.stringify(toJSON());
      expect(json.indexOf('Cat1')).toBeLessThan(json.indexOf('Services'));
      expect(json.indexOf('Cat2')).toBeLessThan(json.indexOf('Services'));
    });

    it('selecting a category with a subcategory auto-selects the first subcategory', () => {
      const { setParentCategoryId, setSubCategoryId, setFormData, setActiveModal } = renderModal({
        activeModal: 'category',
        categories: CATEGORIES,
      });

      fireEvent.press(screen.getByText('Cat1'));

      expect(setParentCategoryId).toHaveBeenCalledWith('c1');
      expect(setSubCategoryId).toHaveBeenCalledWith('c1a');
      expect(applyLastFormDataUpdate(setFormData, { ...initialProductFormData })).toEqual({
        ...initialProductFormData,
        category_id: 'c1a',
      });
      expect(setActiveModal).toHaveBeenCalledWith(null);
    });

    it('selecting a category with no subcategories sets category_id to the category itself', () => {
      const { setParentCategoryId, setSubCategoryId, setFormData } = renderModal({
        activeModal: 'category',
        categories: CATEGORIES,
      });

      fireEvent.press(screen.getByText('Cat2'));

      expect(setParentCategoryId).toHaveBeenCalledWith('c2');
      expect(setSubCategoryId).toHaveBeenCalledWith('');
      expect(applyLastFormDataUpdate(setFormData, { ...initialProductFormData })).toEqual({
        ...initialProductFormData,
        category_id: 'c2',
      });
    });

    it('selecting "No Category" clears the selection', () => {
      const { setParentCategoryId, setSubCategoryId, setFormData, setActiveModal } = renderModal({
        activeModal: 'category',
        categories: CATEGORIES,
        parentCategoryId: 'c1',
      });

      fireEvent.press(screen.getByText('No Category'));

      expect(setParentCategoryId).toHaveBeenCalledWith('');
      expect(setSubCategoryId).toHaveBeenCalledWith('');
      expect(applyLastFormDataUpdate(setFormData, { ...initialProductFormData, category_id: 'c1a' })).toEqual({
        ...initialProductFormData,
        category_id: '',
      });
      expect(setActiveModal).toHaveBeenCalledWith(null);
    });

    it('pressing the close button closes the modal without changing the selection', () => {
      const { setActiveModal, setParentCategoryId, setFormData } = renderModal({
        activeModal: 'category',
        categories: CATEGORIES,
      });

      const nodes = screen.UNSAFE_getAllByProps({ accessible: true });
      // Document order: [backdrop pair, close-button pair, ...list item pairs].
      fireEvent.press(nodes[2]);

      expect(setActiveModal).toHaveBeenCalledWith(null);
      expect(setParentCategoryId).not.toHaveBeenCalled();
      expect(setFormData).not.toHaveBeenCalled();
    });

    it('pressing the backdrop closes the modal without changing the selection', () => {
      const { setActiveModal, setParentCategoryId, setFormData } = renderModal({
        activeModal: 'category',
        categories: CATEGORIES,
      });

      const nodes = screen.UNSAFE_getAllByProps({ accessible: true });
      fireEvent.press(nodes[0]);

      expect(setActiveModal).toHaveBeenCalledWith(null);
      expect(setParentCategoryId).not.toHaveBeenCalled();
      expect(setFormData).not.toHaveBeenCalled();
    });
  });

  describe('subcategory mode', () => {
    const CATEGORIES = [
      { id: 'c1', name: 'Cat1', parent_id: null },
      { id: 'sub-spare', name: 'Spare Parts', slug: 'spare-parts', parent_id: 'c1' },
      { id: 'sub-drink', name: 'Non Alcoholic', slug: 'non-alcoholic', parent_id: 'c1' },
      { id: 'sub-plain', name: 'Plain Sub', parent_id: 'c1' },
    ];

    it('derives vehicle_section from a spare-parts subcategory slug', () => {
      const { setSubCategoryId, setFormData, setActiveModal } = renderModal({
        activeModal: 'subcategory',
        categories: CATEGORIES,
        parentCategoryId: 'c1',
      });

      fireEvent.press(screen.getByText('Spare Parts'));

      expect(setSubCategoryId).toHaveBeenCalledWith('sub-spare');
      expect(applyLastFormDataUpdate(setFormData, { ...initialProductFormData })).toEqual({
        ...initialProductFormData,
        category_id: 'sub-spare',
        vehicle_section: 'spare_part',
      });
      expect(setActiveModal).toHaveBeenCalledWith(null);
    });

    it('derives drink_section from a non-alcoholic subcategory slug', () => {
      const { setFormData } = renderModal({
        activeModal: 'subcategory',
        categories: CATEGORIES,
        parentCategoryId: 'c1',
      });

      fireEvent.press(screen.getByText('Non Alcoholic'));

      expect(applyLastFormDataUpdate(setFormData, { ...initialProductFormData })).toEqual({
        ...initialProductFormData,
        category_id: 'sub-drink',
        drink_section: 'non_alcoholic',
      });
    });

    it('clears vehicle_section for a subcategory with no special slug', () => {
      const { setFormData } = renderModal({
        activeModal: 'subcategory',
        categories: CATEGORIES,
        parentCategoryId: 'c1',
      });

      fireEvent.press(screen.getByText('Plain Sub'));

      expect(applyLastFormDataUpdate(setFormData, { ...initialProductFormData, vehicle_section: 'vehicle' })).toEqual({
        ...initialProductFormData,
        category_id: 'sub-plain',
        vehicle_section: '',
      });
    });
  });

  describe('grade mode', () => {
    it('renders the quality grade options and "No Quality Grade"', () => {
      renderModal({ activeModal: 'grade' });

      expect(screen.getByText('Select Quality Grade')).toBeTruthy();
      expect(screen.getByText('No Quality Grade')).toBeTruthy();
      expect(screen.getByText('Grade A (Premium)')).toBeTruthy();
      expect(screen.getByText('Grade B (Standard)')).toBeTruthy();
      expect(screen.getByText('Grade C (Basic)')).toBeTruthy();
    });

    it('selecting a grade sets quality_grade and closes the modal', () => {
      const { setFormData, setActiveModal } = renderModal({ activeModal: 'grade' });

      fireEvent.press(screen.getByText('Grade B (Standard)'));

      expect(applyLastFormDataUpdate(setFormData, { ...initialProductFormData })).toEqual({
        ...initialProductFormData,
        quality_grade: 'B',
      });
      expect(setActiveModal).toHaveBeenCalledWith(null);
    });

    it('selecting "No Quality Grade" clears quality_grade', () => {
      const { setFormData } = renderModal({
        activeModal: 'grade',
        formData: { ...initialProductFormData, quality_grade: 'A' },
      });

      fireEvent.press(screen.getByText('No Quality Grade'));

      expect(applyLastFormDataUpdate(setFormData, { ...initialProductFormData, quality_grade: 'A' })).toEqual({
        ...initialProductFormData,
        quality_grade: '',
      });
    });
  });

  // The remaining modes are all simple static-option lists that set a single
  // formData field and close — table-driven since they share the same shape.
  describe.each([
    ['weight_unit', 'Select Weight Unit', 'Grams (g)', 'weight_unit', 'g'],
    ['vehicle_section', 'Select Section', 'Spare Part', 'vehicle_section', 'spare_part'],
    ['transmission', 'Select Transmission', 'Manual', 'transmission', 'Manual'],
    ['fuel_type', 'Select Fuel Type', 'Diesel', 'fuel_type', 'Diesel'],
    ['condition', 'Select Condition', 'Used', 'condition', 'Used'],
    ['dietary_info', 'Select Dietary Info', 'Vegan', 'dietary_info', 'Vegan'],
    ['prep_time', 'Select Prep Time', '10-20 min', 'prep_time', '10-20 min'],
    ['drink_section', 'Select Drink Type', 'Non-Alcoholic', 'drink_section', 'non_alcoholic'],
  ] as const)('%s mode', (mode, title, optionLabel, field, value) => {
    it(`renders "${title}" and selecting "${optionLabel}" sets ${field} and closes`, () => {
      const { setFormData, setActiveModal } = renderModal({ activeModal: mode as ActiveModal });

      expect(screen.getByText(title)).toBeTruthy();
      expect(screen.getByText(optionLabel)).toBeTruthy();

      fireEvent.press(screen.getByText(optionLabel));

      expect(applyLastFormDataUpdate(setFormData, { ...initialProductFormData })).toEqual({
        ...initialProductFormData,
        [field]: value,
      });
      expect(setActiveModal).toHaveBeenCalledWith(null);
    });
  });
});
