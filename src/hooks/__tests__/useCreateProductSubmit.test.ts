import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { buildProductCreatePayload, useCreateProductSubmit } from '@/src/hooks/useCreateProductSubmit';
import type { ProductCategoryFlags } from '@/src/hooks/useUpdateProductSubmit';
import { apiPost } from '@/src/services/api';
import { initialProductFormData } from '@/src/lib/productForm';
import type { ProductFormData } from '@/src/lib/productForm';

jest.mock('@/src/services/api', () => ({
  apiPost: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

const mockedApiPost = apiPost as jest.Mock;

const noFlags: ProductCategoryFlags = {
  isFashion: false,
  isAgriculture: false,
  isVehicles: false,
  isReadyToEat: false,
  isDrinks: false,
};

function baseFormData(overrides: Partial<ProductFormData> = {}): ProductFormData {
  return {
    ...initialProductFormData,
    name: 'Rice',
    price: '10000',
    stock_quantity: '5',
    moq: '2',
    category_id: 'agri-rice',
    ...overrides,
  };
}

describe('buildProductCreatePayload', () => {
  it('attaches shop_id and coerces numeric fields, nulling category-specific fields when flags are all false', () => {
    const payload = buildProductCreatePayload(baseFormData(), 'shop-1', ['img1'], [{ name: 'Red', image: '' }], ['M'], noFlags);

    expect(payload.shop_id).toBe('shop-1');
    expect(payload.price).toBe(10000);
    expect(payload.stock_quantity).toBe(5);
    expect(payload.moq).toBe(2);
    expect(payload.images).toEqual(['img1']);
    expect(payload.colors).toBeNull();
    expect(payload.sizes).toBeNull();
    expect(payload.weight_unit).toBeNull();
    expect(payload.vehicle_section).toBeNull();
    expect(payload.dietary_info).toBeNull();
    expect(payload.drink_section).toBeNull();
  });

  it('defaults moq to 1 when it is not a valid number', () => {
    const payload = buildProductCreatePayload(baseFormData({ moq: '' }), 'shop-1', [], [], [], noFlags);
    expect(payload.moq).toBe(1);
  });

  it('includes colors/sizes only when isFashion is true', () => {
    const payload = buildProductCreatePayload(
      baseFormData(),
      'shop-1',
      [],
      [{ name: 'Blue', image: '' }],
      ['S', 'M'],
      { ...noFlags, isFashion: true }
    );
    expect(payload.colors).toEqual([{ name: 'Blue', image: '' }]);
    expect(payload.sizes).toEqual(['S', 'M']);
  });

  it('includes weight_unit only when isAgriculture is true and a unit is set', () => {
    const payload = buildProductCreatePayload(
      baseFormData({ weight_unit: 'Kg' }),
      'shop-1',
      [],
      [],
      [],
      { ...noFlags, isAgriculture: true }
    );
    expect(payload.weight_unit).toBe('Kg');
  });

  it('includes vehicle-only fields scoped to the vehicle_section value', () => {
    const vehiclePayload = buildProductCreatePayload(
      baseFormData({ vehicle_section: 'vehicle', model: 'Corolla', year: '2020', mileage: '50000', part_number: 'X-1' }),
      'shop-1',
      [],
      [],
      [],
      { ...noFlags, isVehicles: true }
    );
    expect(vehiclePayload.model).toBe('Corolla');
    expect(vehiclePayload.year).toBe(2020);
    expect(vehiclePayload.mileage).toBe(50000);
    // part_number is spare_part-only, so it must be nulled for vehicle_section: 'vehicle'
    expect(vehiclePayload.part_number).toBeNull();

    const sparePartPayload = buildProductCreatePayload(
      baseFormData({ vehicle_section: 'spare_part', model: 'Brake Pad', part_number: 'X-1', year: '2020' }),
      'shop-1',
      [],
      [],
      [],
      { ...noFlags, isVehicles: true }
    );
    expect(sparePartPayload.model).toBe('Brake Pad');
    expect(sparePartPayload.part_number).toBe('X-1');
    // year is vehicle-only, so it must be nulled for vehicle_section: 'spare_part'
    expect(sparePartPayload.year).toBeNull();
  });
});

describe('useCreateProductSubmit', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows a validation error and does not call the API when required fields are missing', async () => {
    const { result } = renderHook(() =>
      useCreateProductSubmit({
        accessToken: 'token',
        shopId: 'shop-1',
        formData: baseFormData({ name: '' }),
        images: [],
        colors: [],
        sizes: [],
        flags: noFlags,
      })
    );

    await act(async () => {
      await result.current.handleCreate();
    });

    expect(mockedApiPost).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('shows an error and does not call the API when the shop_id could not be resolved', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { result } = renderHook(() =>
      useCreateProductSubmit({
        accessToken: 'token',
        shopId: null,
        formData: baseFormData(),
        images: [],
        colors: [],
        sizes: [],
        flags: noFlags,
      })
    );

    await act(async () => {
      await result.current.handleCreate();
    });

    expect(mockedApiPost).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Vendor shop details could not be resolved. Please try again.');
    alertSpy.mockRestore();
  });

  it('submits the built payload and navigates back once the success alert is acknowledged', async () => {
    mockedApiPost.mockResolvedValueOnce({ success: true });
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { result } = renderHook(() =>
      useCreateProductSubmit({
        accessToken: 'token',
        shopId: 'shop-1',
        formData: baseFormData(),
        images: ['img1'],
        colors: [],
        sizes: [],
        flags: noFlags,
      })
    );

    await act(async () => {
      await result.current.handleCreate();
    });

    expect(mockedApiPost).toHaveBeenCalledWith(
      '/products',
      expect.objectContaining({ name: 'Rice', price: 10000, images: ['img1'], shop_id: 'shop-1' }),
      'token'
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(alertSpy).toHaveBeenCalledWith('Success', 'Product created successfully', expect.any(Array));
    // Simulate the user tapping "OK" on the success alert.
    const [, , buttons] = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    buttons?.[0]?.onPress?.();
    expect(router.back).toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('stops the loading state and does not navigate back when the API call fails', async () => {
    mockedApiPost.mockRejectedValueOnce(new Error('Network down'));

    const { result } = renderHook(() =>
      useCreateProductSubmit({
        accessToken: 'token',
        shopId: 'shop-1',
        formData: baseFormData(),
        images: [],
        colors: [],
        sizes: [],
        flags: noFlags,
      })
    );

    await act(async () => {
      await result.current.handleCreate();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(router.back).not.toHaveBeenCalled();
  });
});
