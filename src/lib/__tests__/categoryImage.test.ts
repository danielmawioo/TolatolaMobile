import { resolveCategoryImage, categoryImages } from '@/src/constants/categoryImages';

describe('resolveCategoryImage', () => {
  it('prefers an explicit image_url when present', () => {
    expect(resolveCategoryImage({ image_url: 'https://example.com/x.jpg', slug: 'agriculture' })).toBe(
      'https://example.com/x.jpg'
    );
  });

  it('resolves by exact slug match', () => {
    expect(resolveCategoryImage({ slug: 'agriculture' })).toBe(categoryImages.agriculture);
  });

  it('falls back to name-based keyword matching', () => {
    expect(resolveCategoryImage({ name: "Men's Fashion" })).toBe(categoryImages.men);
    expect(resolveCategoryImage({ name: 'Ready to Eat' })).toBe(categoryImages['ready-to-eat']);
    expect(resolveCategoryImage({ name: 'Spare Parts' })).toBe(categoryImages['spare-parts']);
  });

  it('falls back to default when nothing matches', () => {
    expect(resolveCategoryImage({ name: 'Something Unrelated' })).toBe(categoryImages.default);
    expect(resolveCategoryImage({})).toBe(categoryImages.default);
  });
});
