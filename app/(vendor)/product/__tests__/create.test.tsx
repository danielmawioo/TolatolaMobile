import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import CreateProductScreen from '@/app/(vendor)/product/create';
import { useAuth } from '@/src/contexts/AuthContext';
import { useCreateProductData } from '@/src/hooks/useCreateProductData';
import { useCreateProductSubmit } from '@/src/hooks/useCreateProductSubmit';
import { initialProductFormData } from '@/src/lib/productForm';

// This screen composes useCreateProductData (categories/shop/form state) and
// useCreateProductSubmit (submit-in-flight + handleCreate) — both already have
// their own hook-level test suites. Mocking them at the hook boundary here keeps
// this suite focused purely on the screen's own rendering/wiring: does it render
// what the hooks give it, and does pressing "Create Product" call handleCreate.
jest.mock('@/src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/src/hooks/useCreateProductData', () => ({
  useCreateProductData: jest.fn(),
}));

jest.mock('@/src/hooks/useCreateProductSubmit', () => ({
  useCreateProductSubmit: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseCreateProductData = useCreateProductData as jest.Mock;
const mockedUseCreateProductSubmit = useCreateProductSubmit as jest.Mock;

const CATEGORIES = [
  { id: 'cat-agri', name: 'Agriculture', parent_id: null },
  { id: 'cat-rice', name: 'Rice', parent_id: 'cat-agri' },
];

function baseDataHookReturn(overrides: Record<string, any> = {}) {
  return {
    categories: CATEGORIES,
    shopId: 'shop-1',
    formData: { ...initialProductFormData },
    setFormData: jest.fn(),
    images: [],
    setImages: jest.fn(),
    colors: [],
    setColors: jest.fn(),
    sizes: [],
    setSizes: jest.fn(),
    parentCategoryId: '',
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

function baseSubmitHookReturn(overrides: Record<string, any> = {}) {
  return {
    loading: false,
    handleCreate: jest.fn(),
    ...overrides,
  };
}

describe('CreateProductScreen', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({ session: { access_token: 'token-123' } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form wired to data from useCreateProductData', () => {
    mockedUseCreateProductData.mockReturnValue(
      baseDataHookReturn({
        parentCategoryId: 'cat-agri',
        formData: { ...initialProductFormData, name: 'Premium Rice' },
      })
    );
    mockedUseCreateProductSubmit.mockReturnValue(baseSubmitHookReturn());

    render(<CreateProductScreen />);

    expect(screen.getByText('Add Product')).toBeTruthy();
    // Product Name TextInput value comes straight from formData.name.
    expect(screen.getByDisplayValue('Premium Rice')).toBeTruthy();
    // Category picker resolves the selected id against the categories list.
    expect(screen.getByText('Agriculture')).toBeTruthy();
    expect(screen.getByText('Create Product')).toBeTruthy();
  });

  it('renders without crashing before categories/shopId have resolved (the hook\'s initial state)', () => {
    // useCreateProductData starts with categories: [] and shopId: null until its
    // effects resolve — the screen has no separate "loading" flag to key off of,
    // so this is the closest equivalent to a loading-state render.
    mockedUseCreateProductData.mockReturnValue(baseDataHookReturn({ categories: [], shopId: null }));
    mockedUseCreateProductSubmit.mockReturnValue(baseSubmitHookReturn());

    render(<CreateProductScreen />);

    expect(screen.getByText('Add Product')).toBeTruthy();
    expect(screen.getByText('Select Category')).toBeTruthy();
    expect(screen.getByText('Create Product')).toBeTruthy();
  });

  it('calls handleCreate from useCreateProductSubmit when the Create Product button is pressed', () => {
    const handleCreate = jest.fn();
    mockedUseCreateProductData.mockReturnValue(
      baseDataHookReturn({
        formData: {
          ...initialProductFormData,
          name: 'Rice',
          price: '10000',
          stock_quantity: '5',
          category_id: 'cat-rice',
        },
      })
    );
    mockedUseCreateProductSubmit.mockReturnValue(baseSubmitHookReturn({ handleCreate }));

    render(<CreateProductScreen />);
    fireEvent.press(screen.getByText('Create Product'));

    expect(handleCreate).toHaveBeenCalledTimes(1);
  });

  it('surfaces the alert raised by the submit hook without navigating away on a validation problem', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    // Mirrors the real useCreateProductSubmit.handleCreate contract (see
    // useCreateProductSubmit.test.ts): on a validation failure it shows an Alert
    // and resolves without throwing or navigating.
    const handleCreate = jest.fn(async () => {
      Alert.alert('Error', 'Please fill in Name, Price, and Stock Quantity.');
    });
    mockedUseCreateProductData.mockReturnValue(baseDataHookReturn());
    mockedUseCreateProductSubmit.mockReturnValue(baseSubmitHookReturn({ handleCreate }));

    render(<CreateProductScreen />);
    fireEvent.press(screen.getByText('Create Product'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Please fill in Name, Price, and Stock Quantity.')
    );
    expect(router.back).not.toHaveBeenCalled();
    // The screen itself is still showing the form, not having navigated anywhere.
    expect(screen.getByText('Add Product')).toBeTruthy();

    alertSpy.mockRestore();
  });

  it('disables the submit button and shows a spinner instead of the label while the submit hook is loading', () => {
    mockedUseCreateProductData.mockReturnValue(baseDataHookReturn());
    mockedUseCreateProductSubmit.mockReturnValue(baseSubmitHookReturn({ loading: true }));

    render(<CreateProductScreen />);

    expect(screen.queryByText('Create Product')).toBeNull();
    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    expect(screen.UNSAFE_getByProps({ disabled: true }).props.disabled).toBe(true);
  });
});
