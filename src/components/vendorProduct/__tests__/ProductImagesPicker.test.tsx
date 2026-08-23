import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Alert, Image, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ProductImagesPicker } from '@/src/components/vendorProduct/ProductImagesPicker';
import { apiPost } from '@/src/services/api';
import { pickImageSafe, requestImagePermissions } from '@/src/lib/imagePicker';

// ProductImagesPicker delegates the actual native picking to '@/src/lib/imagePicker'
// (pickImageSafe/requestImagePermissions), not expo-image-picker directly — mocking
// at that boundary mirrors the existing convention in
// src/hooks/__tests__/useImageProductSearch.test.ts.
jest.mock('@/src/lib/imagePicker', () => ({
  pickImageSafe: jest.fn(),
  requestImagePermissions: jest.fn(),
}));

jest.mock('@/src/services/api', () => ({
  apiPost: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

const mockedPickImageSafe = pickImageSafe as jest.Mock;
const mockedRequestImagePermissions = requestImagePermissions as jest.Mock;
const mockedApiPost = apiPost as jest.Mock;

function baseProps(overrides: Partial<React.ComponentProps<typeof ProductImagesPicker>> = {}) {
  return {
    images: [] as string[],
    onImagesChange: jest.fn(),
    accessToken: 'token-123',
    uploadingImage: false,
    onUploadingChange: jest.fn(),
    ...overrides,
  };
}

/**
 * Simulates pressing the "Choose from Gallery" upload card, which opens an
 * Alert.alert action sheet — grabs the button config from the Alert.alert spy
 * and invokes its onPress the way the real Alert UI would.
 */
async function pressUploadAndChooseGallery(alertSpy: jest.SpyInstance) {
  fireEvent.press(screen.getByText('Upload'));
  const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2];
  const galleryButton = buttons.find((b: any) => b.text === 'Choose from Gallery');
  await act(async () => {
    await galleryButton.onPress();
  });
}

describe('ProductImagesPicker', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders existing images passed via props', () => {
    render(<ProductImagesPicker {...baseProps({ images: ['https://a.com/1.jpg', 'https://a.com/2.jpg'] })} />);

    const images = screen.UNSAFE_getAllByType(Image);
    expect(images).toHaveLength(2);
    expect(images[0].props.source).toEqual({ uri: 'https://a.com/1.jpg' });
    expect(images[1].props.source).toEqual({ uri: 'https://a.com/2.jpg' });
  });

  it('renders just the upload card with no images (empty state)', () => {
    render(<ProductImagesPicker {...baseProps({ images: [] })} />);

    expect(screen.UNSAFE_queryAllByType(Image)).toHaveLength(0);
    expect(screen.getByText('Upload')).toBeTruthy();
  });

  it('shows a spinner instead of the upload card while an upload is in flight', () => {
    render(<ProductImagesPicker {...baseProps({ uploadingImage: true })} />);

    expect(screen.queryByText('Upload')).toBeNull();
    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('picking a new image via the gallery calls onImagesChange with the new image appended', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onImagesChange = jest.fn();
    const onUploadingChange = jest.fn();
    mockedRequestImagePermissions.mockResolvedValue(true);
    mockedPickImageSafe.mockResolvedValue({
      uri: 'file://picked.jpg',
      base64: 'BASE64DATA',
      mimeType: 'image/jpeg',
      fileName: 'picked.jpg',
    });
    mockedApiPost.mockResolvedValue({ url: 'https://cdn.example.com/uploaded.jpg' });

    render(
      <ProductImagesPicker
        {...baseProps({ images: ['https://a.com/existing.jpg'], onImagesChange, onUploadingChange })}
      />
    );

    await pressUploadAndChooseGallery(alertSpy);

    expect(mockedApiPost).toHaveBeenCalledWith(
      '/uploads/products',
      expect.objectContaining({ data: 'BASE64DATA', contentType: 'image/jpeg' }),
      'token-123'
    );
    expect(onImagesChange).toHaveBeenCalledWith([
      'https://a.com/existing.jpg',
      'https://cdn.example.com/uploaded.jpg',
    ]);
    expect(onUploadingChange).toHaveBeenNthCalledWith(1, true);
    expect(onUploadingChange).toHaveBeenNthCalledWith(2, false);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);

    alertSpy.mockRestore();
  });

  it('removing an image calls onImagesChange with it excluded', () => {
    const onImagesChange = jest.fn();
    render(
      <ProductImagesPicker
        {...baseProps({
          images: ['https://a.com/1.jpg', 'https://a.com/2.jpg', 'https://a.com/3.jpg'],
          onImagesChange,
        })}
      />
    );

    // Pressable (and the FontAwesome icon inside it) each render down to a host
    // View with accessible=true, so every remove button surfaces as a pair of
    // matches here, in the same order as the images array — index 2 is the
    // first accessible node belonging to the second image's remove button.
    const pressables = screen.UNSAFE_getAllByProps({ accessible: true });
    fireEvent.press(pressables[2]);

    expect(onImagesChange).toHaveBeenCalledWith(['https://a.com/1.jpg', 'https://a.com/3.jpg']);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('does not update images when the user cancels the picker', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onImagesChange = jest.fn();
    const onUploadingChange = jest.fn();
    mockedRequestImagePermissions.mockResolvedValue(true);
    mockedPickImageSafe.mockResolvedValue(null);

    render(<ProductImagesPicker {...baseProps({ onImagesChange, onUploadingChange })} />);
    await pressUploadAndChooseGallery(alertSpy);

    expect(mockedApiPost).not.toHaveBeenCalled();
    expect(onImagesChange).not.toHaveBeenCalled();
    expect(onUploadingChange).toHaveBeenNthCalledWith(1, true);
    expect(onUploadingChange).toHaveBeenNthCalledWith(2, false);

    alertSpy.mockRestore();
  });

  it('does not attempt to upload when permissions are denied', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onUploadingChange = jest.fn();
    mockedRequestImagePermissions.mockResolvedValue(false);

    render(<ProductImagesPicker {...baseProps({ onUploadingChange })} />);
    await pressUploadAndChooseGallery(alertSpy);

    expect(mockedPickImageSafe).not.toHaveBeenCalled();
    expect(onUploadingChange).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('shows an upload error alert and clears the uploading flag when the upload fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onUploadingChange = jest.fn();
    mockedRequestImagePermissions.mockResolvedValue(true);
    mockedPickImageSafe.mockResolvedValue({
      uri: 'file://picked.jpg',
      base64: 'BASE64DATA',
      mimeType: 'image/jpeg',
      fileName: 'picked.jpg',
    });
    mockedApiPost.mockRejectedValue(new Error('Network down'));

    render(<ProductImagesPicker {...baseProps({ onUploadingChange })} />);
    await pressUploadAndChooseGallery(alertSpy);

    expect(alertSpy).toHaveBeenCalledWith('Upload Error', 'Network down');
    expect(onUploadingChange).toHaveBeenNthCalledWith(1, true);
    expect(onUploadingChange).toHaveBeenNthCalledWith(2, false);

    alertSpy.mockRestore();
  });
});
