import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { buildProductUpdatePayload, useUpdateProductSubmit, type ProductCategoryFlags } from '@/src/hooks/useUpdateProductSubmit';
import { apiPut } from '@/src/services/api';
import { initialProductFormData } from '@/src/lib/productForm';
import type { EditProductFormData } from '@/src/hooks/useEditProductData';

jest.mock('@/src/services/api', () => ({
  apiPut: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

const mockedApiPut = apiPut as jest.Mock;

const noFlags: ProductCategoryFlags = {
  isFashion: false,
  isAgriculture: false,
  isVehicles: false,
  isReadyToEat: false,
  isDrinks: false,
};

function baseFormData(overrides: Partial<EditProductFormData> = {}): EditProductFormData {
  return {
    ...initialProductFormData,
    delivery_available: true,
    name: 'Rice',
    price: '10000',
    stock_quantity: '5',
    moq: '2',
    category_id: 'agri-rice',
    ...overrides,
  };
}

describe('buildProductUpdatePayload', () => {
  it('coerces numeric fields and nulls out category-specific fields when flags are all false', () => {
    const payload = buildProductUpdatePayload(baseFormData(), ['img1'], [{ name: 'Red', image: '' }], ['M'], noFlags);

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
    const payload = buildProductUpdatePayload(baseFormData({ moq: '' }), [], [], [], noFlags);
    expect(payload.moq).toBe(1);
  });

  it('includes colors/sizes only when isFashion is true', () => {
    const payload = buildProductUpdatePayload(
      baseFormData(),
      [],
      [{ name: 'Blue', image: '' }],
      ['S', 'M'],
      { ...noFlags, isFashion: true }
    );
    expect(payload.colors).toEqual([{ name: 'Blue', image: '' }]);
    expect(payload.sizes).toEqual(['S', 'M']);
  });

  it('includes weight_unit only when isAgriculture is true and a unit is set', () => {
    const payload = buildProductUpdatePayload(
      baseFormData({ weight_unit: 'Kg' }),
      [],
      [],
      [],
      { ...noFlags, isAgriculture: true }
    );
    expect(payload.weight_unit).toBe('Kg');
  });

  it('includes vehicle-only fields scoped to the vehicle_section value', () => {
    const vehiclePayload = buildProductUpdatePayload(
      baseFormData({ vehicle_section: 'vehicle', model: 'Corolla', year: '2020', mileage: '50000', part_number: 'X-1' }),
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

    const sparePartPayload = buildProductUpdatePayload(
      baseFormData({ vehicle_section: 'spare_part', model: 'Brake Pad', part_number: 'X-1', year: '2020' }),
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

describe('useUpdateProductSubmit', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows a validation error and does not call the API when required fields are missing', async () => {
    const { result } = renderHook(() =>
      useUpdateProductSubmit({
        id: 'p1',
        accessToken: 'token',
        formData: baseFormData({ name: '' }),
        images: [],
        colors: [],
        sizes: [],
        flags: noFlags,
      })
    );

    await act(async () => {
      await result.current.handleUpdate();
    });

    expect(mockedApiPut).not.toHaveBeenCalled();
    expect(result.current.saving).toBe(false);
  });

  it('submits the built payload and navigates back once the success alert is acknowledged', async () => {
    mockedApiPut.mockResolvedValueOnce({ success: true });
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { result } = renderHook(() =>
      useUpdateProductSubmit({
        id: 'p1',
        accessToken: 'token',
        formData: baseFormData(),
        images: ['img1'],
        colors: [],
        sizes: [],
        flags: noFlags,
      })
    );

    await act(async () => {
      await result.current.handleUpdate();
    });

    expect(mockedApiPut).toHaveBeenCalledWith(
      '/products/p1',
      expect.objectContaining({ name: 'Rice', price: 10000, images: ['img1'] }),
      'token'
    );
    await waitFor(() => expect(result.current.saving).toBe(false));

    expect(alertSpy).toHaveBeenCalledWith('Success', 'Product updated successfully', expect.any(Array));
    // Simulate the user tapping "OK" on the success alert.
    const [, , buttons] = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    buttons?.[0]?.onPress?.();
    expect(router.back).toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('stops the saving state and does not navigate back when the API call fails', async () => {
    mockedApiPut.mockRejectedValueOnce(new Error('Network down'));

    const { result } = renderHook(() =>
      useUpdateProductSubmit({
        id: 'p1',
        accessToken: 'token',
        formData: baseFormData(),
        images: [],
        colors: [],
        sizes: [],
        flags: noFlags,
      })
    );

    await act(async () => {
      await result.current.handleUpdate();
    });

    await waitFor(() => expect(result.current.saving).toBe(false));
    expect(router.back).not.toHaveBeenCalled();
  });
});
