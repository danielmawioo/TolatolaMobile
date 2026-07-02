/**
 * Shared API/domain types. Use these instead of `any` for type safety and better DX.
 */

export interface Product {
  id: string;
  name: string;
  price?: number;
  description?: string;
  image_url?: string | null;
  images?: string[];
  shop_id?: string;
  location?: string;
  moq?: string | number;
  delivery_available?: boolean;
  is_vendor_verified?: boolean;
  currency?: string;
  discount?: number;
  stock?: number;
  stock_quantity?: number;
  quality_grade?: string;
  sku?: string;
  categories?: { name: string };
  colors?: { name: string; image?: string }[];
  sizes?: string[];
  weight_unit?: string;
  unit?: string;
  [key: string]: unknown;
}

export interface Order {
  id: string;
  order_number?: string;
  total_amount?: number;
  status?: string;
  created_at?: string;
  items_count?: number;
  [key: string]: unknown;
}

export interface Banner {
  id: string;
  title?: string;
  description?: string;
  image_url?: string | null;
  price?: number;
  [key: string]: unknown;
}

export interface Shop {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  [key: string]: unknown;
}
