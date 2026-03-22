export interface Category {
  id: string;
  name: string;
  collapsed: boolean;
}

export interface Product {
  id: string;
  catId: string;
  name: string;
  price: number;
  mass: number;
  img: string;
  imgs?: string[];
  link: string;
  desc: string;
}

export interface OrderItem {
  prodId: string;
  sellPrice: number;
}

export interface OrderColor {
  fg: string;
  bg: string;
}

export interface Order {
  id: string;
  name: string;
  color: OrderColor;
  delivery: number;
  otherFees: number;
  items: OrderItem[];
}

export interface SaleRecord {
  id: string;
  productId: string;
  productName: string;
  productCost: number;
  sellPrice: number;
  date: string; // YYYY-MM-DD
  platform: string;
  orderId?: string; // set when created automatically from an order
}

export interface WatchedItem {
  id: string;
  name: string;
  link?: string;
  buyPrice: number;
  sellPrice?: number;
  status: 'watching' | 'bought' | 'sold';
  category?: string;
  size?: string;
  brand?: string;
  platform?: string;
  addedDate: string;
  soldDate?: string;
  notes?: string;
}

export interface AppState {
  categories: Category[];
  products: Product[];
  orders: Order[];
  sales?: SaleRecord[];
  watched?: WatchedItem[];
}

export interface OrderRowCalc {
  product: Product;
  item: OrderItem;
  massPercent: number;
  deliveryShare: number;
  otherFeesShare: number;
  totalCost: number;
  profit: number | null;
}
