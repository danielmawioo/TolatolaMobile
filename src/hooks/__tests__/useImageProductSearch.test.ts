import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useImageProductSearch } from '@/src/hooks/useImageProductSearch';
import { apiPost } from '@/src/services/api';

jest.mock('@/src/services/api', () => ({
  apiPost: jest.fn(),
}));

jest.mock('@/src/lib/imagePicker', () => ({
  pickImageSafe: jest.fn(),
  requestImagePermissions: jest.fn(),
}));

const mockedApiPost = apiPost as jest.Mock;

describe('useImageProductSearch', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not search automatically when no image param is provided', () => {
    const { result } = renderHook(() => useImageProductSearch());

    expect(result.current.isImageSearching).toBe(false);
    expect(result.current.isImageSearchMode).toBe(false);
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('automatically runs a search when an image is provided and stores the results', async () => {
    mockedApiPost.mockResolvedValue({
      data: [{ id: 'p1', name: 'Blue Shoes' }],
      analysis: 'Blue running shoes',
      keywords: ['blue', 'shoes'],
    });

    const { result } = renderHook(() => useImageProductSearch('base64data', 'image/png'));

    expect(result.current.isImageSearching).toBe(true);
    expect(result.current.isImageSearchMode).toBe(true);

    await waitFor(() => expect(result.current.isImageSearching).toBe(false));

    expect(mockedApiPost).toHaveBeenCalledWith('/products/search-by-image', {
      image: 'data:image/png;base64,base64data',
    });
    expect(result.current.imageSearchResults).toEqual([{ id: 'p1', name: 'Blue Shoes' }]);
    expect(result.current.imageAnalysis).toBe('Blue running shoes');
    expect(result.current.imageKeywords).toEqual(['blue', 'shoes']);
    expect(result.current.isImageSearchMode).toBe(true);
  });

  it('clears image search state back to inactive', async () => {
    mockedApiPost.mockResolvedValue({ data: [{ id: 'p1' }] });
    const { result } = renderHook(() => useImageProductSearch('base64data'));

    await waitFor(() => expect(result.current.isImageSearching).toBe(false));
    expect(result.current.isImageSearchMode).toBe(true);

    act(() => {
      result.current.handleClearImageSearch();
    });

    expect(result.current.imageSearchResults).toBeNull();
    expect(result.current.imageAnalysis).toBe('');
    expect(result.current.imageKeywords).toEqual([]);
    expect(result.current.isImageSearchMode).toBe(false);
  });

  it('sets an empty results array and leaves search mode active when the API call fails', async () => {
    mockedApiPost.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useImageProductSearch('base64data'));

    await waitFor(() => expect(result.current.isImageSearching).toBe(false));

    expect(result.current.imageSearchResults).toEqual([]);
    expect(result.current.isImageSearchMode).toBe(true);
  });
});
