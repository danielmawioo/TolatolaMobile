import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import EditProductScreen from '@/app/(vendor)/product/edit';
import { useAuth } from '@/src/contexts/AuthContext';
import { useEditProductData } from '@/src/hooks/useEditProductData';
import { useUpdateProductSubmit } from '@/src/hooks/useUpdateProductSubmit';
import { initialProductFormData } from '@/src/lib/productForm';

jest.mock('@/src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/src/hooks/useEditProductData', () => ({
  useEditProductData: jest.fn(),
}));

jest.mock('@/src/hooks/useUpdateProductSubmit', () => ({
  useUpdateProductSubmit: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 'product-1' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseEditProductData = useEditProductData as jest.Mock;
const mockedUseUpdateProductSubmit = useUpdateProductSubmit as jest.Mock;

const CATEGORIES = [{ id: 'cat-electronics', name: 'Electronics', parent_id: null }];

function baseEditData(overrides: Partial<ReturnType<typeof useEditProductData>> = {}) {
  return {
    loading: false,
    categories: CATEGORIES,
    formData: {
      ...initialProductFormData,
      delivery_available: true,
      name: 'Existing Widget',
      price: '15000',
      stock_quantity: '10',
      category_id: 'cat-electronics',
    },
    setFormData: jest.fn(),
    images: [],
    setImages: jest.fn(),
    colors: [],
    setColors: jest.fn(),
    sizes: [],
    setSizes: jest.fn(),
    parentCategoryId: 'cat-electronics',
    setParentCategoryId: jest.fn(),
    subCategoryId: '',
    setSubCategoryId: jest.fn(),
    selectedGradeLabel: '',
    isFashion: false,
    isAgriculture: false,
    isVehicles: false,
    isReadyToEat: false,
    isDrinks: false,
    ...overrides,
  };
}

describe('EditProductScreen', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({ session: { access_token: 'token-123' } });
    mockedUseEditProductData.mockReturnValue(baseEditData());
    mockedUseUpdateProductSubmit.mockReturnValue({ saving: false, handleUpdate: jest.fn() });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the pre-filled form using the data from useEditProductData', () => {
    render(<EditProductScreen />);

    expect(screen.getByText('Edit Product')).toBeTruthy();
    expect(screen.getByDisplayValue('Existing Widget')).toBeTruthy();
    expect(screen.getByDisplayValue('15000')).toBeTruthy();
    expect(screen.getByDisplayValue('10')).toBeTruthy();
    expect(screen.getByText('Electronics')).toBeTruthy();
    expect(screen.getByText('Update Product')).toBeTruthy();
  });

  it('shows a loading indicator instead of the form while the existing product is being fetched', () => {
    mockedUseEditProductData.mockReturnValue(baseEditData({ loading: true }));

    render(<EditProductScreen />);

    expect(screen.queryByText('Edit Product')).toBeNull();
    expect(screen.queryByText('Update Product')).toBeNull();
    expect(screen.queryByDisplayValue('Existing Widget')).toBeNull();
  });

  it('renders the empty form gracefully instead of crashing when the product failed to load', () => {
    // Mirrors what useEditProductData looks like right after a failed fetch: loading
    // has flipped to false, but formData/categories never got populated (the real
    // hook alerts + navigates back on this path; here we only check the screen
    // itself tolerates the "nothing loaded" shape without throwing).
    mockedUseEditProductData.mockReturnValue(
      baseEditData({
        categories: [],
        formData: { ...initialProductFormData, delivery_available: true },
        parentCategoryId: '',
      })
    );

    expect(() => render(<EditProductScreen />)).not.toThrow();
    expect(screen.getByText('Select Category')).toBeTruthy();
    expect(screen.getByText('Update Product')).toBeTruthy();
  });

  it('calls handleUpdate from useUpdateProductSubmit when Update Product is pressed', () => {
    const handleUpdate = jest.fn();
    mockedUseUpdateProductSubmit.mockReturnValue({ saving: false, handleUpdate });

    render(<EditProductScreen />);
    fireEvent.press(screen.getByText('Update Product'));

    expect(handleUpdate).toHaveBeenCalledTimes(1);
  });

  it('keeps the form visible and does not navigate back when handleUpdate reports a validation error', async () => {
    // Mirrors what the real useUpdateProductSubmit does on a validation failure
    // (see useUpdateProductSubmit.test.ts): it resolves normally after surfacing
    // an Alert, rather than throwing/rejecting or navigating away.
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const handleUpdate = jest.fn().mockImplementation(async () => {
      Alert.alert('Error', 'Please fill in Name, Price, and Stock Quantity.');
    });
    mockedUseUpdateProductSubmit.mockReturnValue({ saving: false, handleUpdate });

    render(<EditProductScreen />);
    fireEvent.press(screen.getByText('Update Product'));

    await waitFor(() => expect(handleUpdate).toHaveBeenCalledTimes(1));

    expect(alertSpy).toHaveBeenCalledWith('Error', 'Please fill in Name, Price, and Stock Quantity.');
    // The screen itself has no submit-error handling of its own (that lives inside
    // useUpdateProductSubmit, which is mocked here) — what it must do is simply
    // stay put so the user can fix the form and retry, rather than navigating away.
    expect(screen.getByText('Update Product')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('disables the submit button and shows a spinner instead of the label while saving', () => {
    mockedUseUpdateProductSubmit.mockReturnValue({ saving: true, handleUpdate: jest.fn() });

    const { UNSAFE_getByProps } = render(<EditProductScreen />);

    expect(screen.queryByText('Update Product')).toBeNull();
    expect(UNSAFE_getByProps({ disabled: true })).toBeTruthy();
  });
});
