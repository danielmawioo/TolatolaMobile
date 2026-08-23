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
  category_name?: string;
  shops?: { latitude?: number; longitude?: number };
  shop_latitude?: number;
  shop_longitude?: number;
  colors?: { name: string; image?: string; price?: number }[];
  sizes?: string[];
  size_prices?: Record<string, number> | null;
  weight_unit?: string;
  unit?: string;
  
  // Vehicles metadata
  vehicle_section?: string;
  brand?: string;
  model?: string;
  year?: number | string;
  mileage?: number;
  transmission?: string;
  fuel_type?: string;
  engine_size?: string;
  part_number?: string;
  compatibility?: string;
  condition?: string;

  // Ready to Eat metadata
  dietary_info?: string;
  prep_time?: string;

  // Drinks metadata
  drink_section?: string;

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
  background_color?: string;
  text_color?: string;
  button_text?: string;
  button_link?: string;
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

export interface Vendor {
  id: string;
  business_name?: string;
  phone?: string;
  description?: string;
  kyc_status?: string;
  kyc_notes?: string;
  [key: string]: unknown;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  parent_id?: string | null;
  image_url?: string | null;
  [key: string]: unknown;
}
