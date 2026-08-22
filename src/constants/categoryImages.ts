/**
 * Category image fallbacks — mirrors the website's category imagery.
 * Previously duplicated verbatim across app/(tabs)/index.tsx, categories.tsx,
 * and shop.tsx (the latter with two identical copies).
 */
export const categoryImages: Record<string, string> = {
  "fast-moving-consumer-goods": "https://tolatola.co/category-fmcg.jpg",
  agriculture: "https://tolatola.co/category-agriculture.jpg",
  "construction-hardware": "https://tolatola.co/category-hardware.jpg",
  handicrafts: "https://tolatola.co/category-handicrafts.jpg",
  "food-beverages": "https://tolatola.co/category-food-beverages.jpg",
  textiles: "https://tolatola.co/category-textiles.jpg",
  fashion: "https://tolatola.co/category-textiles.jpg",
  men: "https://images.unsplash.com/photo-1490578474895-699bc4e2cf59?auto=format&fit=crop&w=500&q=80",
  women: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=500&q=80",
  kids: "https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=500&q=80",
  electronics: "https://tolatola.co/category-electronics.jpg",
  "home-garden": "https://tolatola.co/category-home-garden.jpg",
  "health-beauty": "https://tolatola.co/category-health-beauty.jpg",
  services: "https://tolatola.co/category-services.jpg",
  vehicles: "https://tolatola.co/category-vehicles.jpg",
  "vehicles-sub": "https://tolatola.co/category-vehicles-sub.jpg",
  "ready-to-eat": "https://tolatola.co/category-ready-to-eat.jpg",
  "spare-parts": "https://tolatola.co/category-spare-parts.jpg",
  drinks: "https://tolatola.co/category-drinks.jpg",
  "non-alcoholic": "https://tolatola.co/category-non-alcoholic.jpg",
  alcoholic: "https://tolatola.co/category-alcoholic.jpg",
  motorcycles: "https://tolatola.co/category-motorcycles.jpg",
  default: "https://tolatola.co/placeholder.jpg",
};

interface CategoryLike {
  image_url?: string;
  slug?: string;
  name?: string;
}

export function resolveCategoryImage(cat: CategoryLike): string {
  if (cat.image_url) return cat.image_url;
  if (cat.slug && categoryImages[cat.slug]) {
    return categoryImages[cat.slug];
  }
  const nameLower = (cat.name || '').toLowerCase();
  if (nameLower === 'men' || nameLower.includes("men's") || nameLower.includes('mens')) return categoryImages.men;
  if (nameLower === 'women' || nameLower.includes("women's") || nameLower.includes('womens')) return categoryImages.women;
  if (nameLower === 'kids' || nameLower.includes("kid's") || nameLower.includes('children')) return categoryImages.kids;
  if (nameLower.includes('ready to eat') || nameLower.includes('ready-to-eat')) return categoryImages["ready-to-eat"];
  if (nameLower.includes('spare') || nameLower.includes('part')) return categoryImages["spare-parts"];
  if (nameLower.includes('drink') || nameLower.includes('alcohol')) return categoryImages.drinks;
  if (nameLower.includes('agri') || nameLower.includes('farm')) return categoryImages.agriculture;
  if (nameLower.includes('food') || nameLower.includes('bev') || nameLower.includes('beverage')) return categoryImages["food-beverages"];
  if (nameLower.includes('construct') || nameLower.includes('hard') || nameLower.includes('hardware')) return categoryImages["construction-hardware"];
  if (nameLower.includes('electro')) return categoryImages.electronics;
  if (nameLower.includes('health') || nameLower.includes('beauty')) return categoryImages["health-beauty"];
  if (nameLower.includes('service')) return categoryImages.services;
  if (nameLower.includes('fmcg') || nameLower.includes('fast') || nameLower.includes('moving')) return categoryImages["fast-moving-consumer-goods"];
  if (nameLower.includes('motorcycle')) return categoryImages.motorcycles;
  if (nameLower.includes('vehicle') || nameLower.includes('car') || nameLower.includes('auto') || nameLower.includes('motor')) return categoryImages.vehicles;
  if (nameLower.includes('handicraft') || nameLower.includes('craft')) return categoryImages.handicrafts;
  if (nameLower.includes('home') || nameLower.includes('garden')) return categoryImages["home-garden"];
  if (nameLower.includes('textile') || nameLower.includes('fabric') || nameLower.includes('cloth') || nameLower.includes('fashion')) return categoryImages.textiles;
  return categoryImages.default;
}
