import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { FashionVariationsEditor } from '@/src/components/vendorProduct/FashionVariationsEditor';
import { apiPost } from '@/src/services/api';
import { pickImageSafe, requestImagePermissions } from '@/src/lib/imagePicker';
import type { ProductColor } from '@/src/hooks/useEditProductData';

// Same mocking boundary as ProductImagesPicker.test.tsx: the component delegates
// native picking to '@/src/lib/imagePicker', matching the convention already used
// in src/hooks/__tests__/useImageProductSearch.test.ts.
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

function baseProps(overrides: Partial<React.ComponentProps<typeof FashionVariationsEditor>> = {}) {
  return {
    colors: [] as ProductColor[],
    onColorsChange: jest.fn(),
    sizes: [] as string[],
    onSizesChange: jest.fn(),
    accessToken: 'token-123',
    ...overrides,
  };
}

describe('FashionVariationsEditor', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders existing colors and sizes from props', () => {
    render(
      <FashionVariationsEditor
        {...baseProps({
          sizes: ['S', 'M'],
          colors: [{ name: 'Cherry Red', image: 'https://a.com/red.jpg' }],
        })}
      />
    );

    expect(screen.getByText('Fashion Variations')).toBeTruthy();
    expect(screen.getByText('S')).toBeTruthy();
    expect(screen.getByText('M')).toBeTruthy();
    expect(screen.getByText('Cherry Red')).toBeTruthy();
  });

  it('adding a new size uppercases it and calls onSizesChange with it appended', () => {
    const onSizesChange = jest.fn();
    render(<FashionVariationsEditor {...baseProps({ sizes: ['S'], onSizesChange })} />);

    const sizeInput = screen.getByPlaceholderText('e.g. S, M, L, XL, 42');
    fireEvent.changeText(sizeInput, 'xl');
    fireEvent(sizeInput, 'submitEditing');

    expect(onSizesChange).toHaveBeenCalledWith(['S', 'XL']);
  });

  it('does not add a size that already exists (case-insensitively)', () => {
    const onSizesChange = jest.fn();
    render(<FashionVariationsEditor {...baseProps({ sizes: ['M'], onSizesChange })} />);

    const sizeInput = screen.getByPlaceholderText('e.g. S, M, L, XL, 42');
    fireEvent.changeText(sizeInput, 'm');
    fireEvent(sizeInput, 'submitEditing');

    expect(onSizesChange).not.toHaveBeenCalled();
  });

  it('does not add a blank size', () => {
    const onSizesChange = jest.fn();
    render(<FashionVariationsEditor {...baseProps({ sizes: ['M'], onSizesChange })} />);

    const sizeInput = screen.getByPlaceholderText('e.g. S, M, L, XL, 42');
    fireEvent.changeText(sizeInput, '   ');
    fireEvent(sizeInput, 'submitEditing');

    expect(onSizesChange).not.toHaveBeenCalled();
  });

  it('removing a size calls onSizesChange with it excluded', () => {
    const onSizesChange = jest.fn();
    render(<FashionVariationsEditor {...baseProps({ sizes: ['S', 'M', 'L'], onSizesChange })} />);

    // FontAwesome renders its glyph through an inner accessible host view in
    // addition to the Pressable's own accessible view, so every icon-only button
    // surfaces as a pair of matches here (verified empirically). Pair 0 (indices
    // 0-1) is the "add size" plus button; pair 1 (indices 2-3) is the "S" chip's
    // remove button; pair 2 (indices 4-5) is the "M" chip's remove button.
    const accessibleNodes = screen.UNSAFE_getAllByProps({ accessible: true });
    fireEvent.press(accessibleNodes[4]);

    expect(onSizesChange).toHaveBeenCalledWith(['S', 'L']);
  });

  it('the add-color button is disabled and does nothing while the color name is blank', () => {
    const onColorsChange = jest.fn();
    render(<FashionVariationsEditor {...baseProps({ onColorsChange })} />);

    const nameInput = screen.getByPlaceholderText('e.g. Cherry Red');
    expect(nameInput.props.value).toBe('');

    const accessibleNodes = screen.UNSAFE_getAllByProps({ accessible: true });
    accessibleNodes.forEach((node) => fireEvent.press(node));

    expect(onColorsChange).not.toHaveBeenCalled();
  });

  it('adding a color with just a name calls onColorsChange with an empty image', () => {
    const onColorsChange = jest.fn();
    render(<FashionVariationsEditor {...baseProps({ onColorsChange })} />);

    const nameInput = screen.getByPlaceholderText('e.g. Cherry Red');
    fireEvent.changeText(nameInput, 'Ocean Blue');

    // varColorForm renders [nameInput, imageButton, addButton] — the add button's
    // Pressable+Icon accessible pair comes after the image button's pair.
    const accessibleNodes = screen.UNSAFE_getAllByProps({ accessible: true });
    fireEvent.press(accessibleNodes[accessibleNodes.length - 1]);

    expect(onColorsChange).toHaveBeenCalledWith([{ name: 'Ocean Blue', image: '' }]);
  });

  it('picking a color image before adding includes the uploaded image url', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onColorsChange = jest.fn();
    mockedRequestImagePermissions.mockResolvedValue(true);
    mockedPickImageSafe.mockResolvedValue({
      uri: 'file://picked.jpg',
      base64: 'BASE64DATA',
      mimeType: 'image/jpeg',
      fileName: 'picked.jpg',
    });
    mockedApiPost.mockResolvedValue({ url: 'https://cdn.example.com/color.jpg' });

    render(<FashionVariationsEditor {...baseProps({ onColorsChange })} />);

    const nameInput = screen.getByPlaceholderText('e.g. Cherry Red');
    fireEvent.changeText(nameInput, 'Forest Green');

    // Press the camera/image button (second-to-last accessible pair in the color form).
    let accessibleNodes = screen.UNSAFE_getAllByProps({ accessible: true });
    const imageButtonIndex = accessibleNodes.length - 3;
    await act(async () => {
      fireEvent.press(accessibleNodes[imageButtonIndex]);
    });
    const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1]![2]!;
    const galleryButton = buttons.find((b: any) => b.text === 'Gallery')!;
    await act(async () => {
      await galleryButton.onPress!();
    });

    expect(mockedApiPost).toHaveBeenCalledWith(
      '/uploads/products',
      expect.objectContaining({ data: 'BASE64DATA', contentType: 'image/jpeg' }),
      'token-123'
    );

    accessibleNodes = screen.UNSAFE_getAllByProps({ accessible: true });
    fireEvent.press(accessibleNodes[accessibleNodes.length - 1]);

    expect(onColorsChange).toHaveBeenCalledWith([
      { name: 'Forest Green', image: 'https://cdn.example.com/color.jpg' },
    ]);

    alertSpy.mockRestore();
  });

  it('removing a color calls onColorsChange with it excluded', () => {
    const onColorsChange = jest.fn();
    render(
      <FashionVariationsEditor
        {...baseProps({
          colors: [
            { name: 'Red', image: '' },
            { name: 'Blue', image: '' },
          ],
          onColorsChange,
        })}
      />
    );

    const accessibleNodes = screen.UNSAFE_getAllByProps({ accessible: true });
    // The color chips' remove buttons come after the size block's add button and
    // the color form's image/add buttons — press the very last accessible node,
    // which belongs to the last color chip ("Blue").
    fireEvent.press(accessibleNodes[accessibleNodes.length - 1]);

    expect(onColorsChange).toHaveBeenCalledWith([{ name: 'Red', image: '' }]);
  });
});
